/**
 * Server-side identity provisioning: creating users + their org on signup and
 * on first Google sign-in. Keeps all multi-tenant bootstrapping in one place.
 */
import 'server-only';
import bcrypt from 'bcryptjs';
import { connectToDatabase, Membership, Org, User, mongoose } from '@mailflow/db';
import type { SignUpInput } from '@mailflow/shared';
import { slugify, randomToken } from './slug';
import { generateVerificationToken, generateOtp } from './verification';

export interface ProvisionedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  orgId: string;
  role: 'superadmin' | 'admin' | 'member' | 'viewer';
  emailVerified: boolean;
}

/** A freshly-created credentials user also carries its one-time verify token + OTP. */
export type CreatedUser = ProvisionedUser & { verificationToken?: string; otp?: string };

/** Generate an org slug that is unique across the collection. */
async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'workspace';
  // Try the bare slug first, then suffix until free.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${randomToken(3)}`;
    const exists = await Org.exists({ slug: candidate });
    if (!exists) return candidate;
  }
  return `${root}-${randomToken(5)}`;
}

/**
 * Create an Org + owner User + Membership atomically. The first user of an org
 * is its `admin` (owner). Throws if the email already exists.
 */
export async function createUserWithOrg(
  input: SignUpInput,
  opts?: { emailVerified?: boolean },
): Promise<CreatedUser> {
  await connectToDatabase();

  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const orgName = input.orgName?.trim() || `${input.name}'s workspace`;
  const slug = await uniqueSlug(orgName);
  const hashedPassword = await bcrypt.hash(input.password, 12);
  // Credentials signups must verify their email; OAuth-provisioned users are
  // pre-verified by the identity provider (see ensureOAuthUser).
  const verify = opts?.emailVerified ? null : generateVerificationToken();
  const otp = opts?.emailVerified ? null : generateOtp();

  const session = await mongoose.startSession();
  try {
    let provisioned: CreatedUser | null = null;

    await session.withTransaction(async () => {
      const [org] = await Org.create(
        [{ name: orgName, slug, ownerId: new mongoose.Types.ObjectId(), plan: 'free' }],
        { session },
      );
      if (!org) throw new Error('PROVISION_FAILED');

      const [user] = await User.create(
        [
          {
            orgId: org._id,
            email: input.email,
            name: input.name,
            role: 'admin',
            hashedPassword,
            emailVerified: opts?.emailVerified ? new Date() : undefined,
            verificationTokenHash: verify?.hash,
            verificationTokenExpires: verify?.expires,
            otpHash: otp?.hash,
            otpExpires: otp?.expires,
            otpAttempts: otp ? 0 : undefined,
          },
        ],
        { session },
      );
      if (!user) throw new Error('PROVISION_FAILED');

      // Backfill the owner now that we have the user id.
      org.ownerId = user._id;
      await org.save({ session });

      await Membership.create([{ userId: user._id, orgId: org._id, role: 'admin' }], { session });

      provisioned = {
        id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        orgId: org._id.toString(),
        role: 'admin',
        emailVerified: Boolean(opts?.emailVerified),
        verificationToken: verify?.raw,
        otp: otp?.raw,
      };
    });

    if (!provisioned) throw new Error('PROVISION_FAILED');
    return provisioned;
  } finally {
    await session.endSession();
  }
}

/**
 * Resolve (or lazily create) a user from a Google sign-in. New Google users get
 * their own org, mirroring the credentials signup path.
 */
export async function ensureOAuthUser(profile: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<ProvisionedUser> {
  await connectToDatabase();

  const existing = await User.findOne({ email: profile.email });
  if (existing) {
    // Google has proven ownership of this address, so mark it verified (this is
    // what makes linking a Google login to an existing account safe).
    let changed = false;
    if (!existing.emailVerified) {
      existing.emailVerified = new Date();
      existing.verificationTokenHash = undefined;
      existing.verificationTokenExpires = undefined;
      changed = true;
    }
    if (profile.image && existing.image !== profile.image) {
      existing.image = profile.image;
      changed = true;
    }
    if (changed) await existing.save();
    return {
      id: existing._id.toString(),
      email: existing.email,
      name: existing.name ?? null,
      image: existing.image ?? null,
      orgId: existing.orgId.toString(),
      role: existing.role,
      emailVerified: true,
    };
  }

  const name = profile.name || profile.email.split('@')[0] || 'User';
  const provisioned = await createUserWithOrg(
    {
      name,
      email: profile.email,
      // OAuth users never use this password; store a random hash placeholder.
      password: randomToken(24),
    },
    { emailVerified: true },
  );

  if (profile.image) {
    await User.updateOne({ _id: provisioned.id }, { image: profile.image });
    provisioned.image = profile.image;
  }
  return provisioned;
}

/** Validate credentials and return the user, or null on failure. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<ProvisionedUser | null> {
  await connectToDatabase();
  const user = await User.findOne({ email }).select('+hashedPassword');
  if (!user?.hashedPassword) return null;

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    orgId: user.orgId.toString(),
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
  };
}
