'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { contactCreateSchema, type ContactCreateInput } from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/client-api';

const NONE = '__none__';

interface ListOption {
  id: string;
  name: string;
}

export function AddContactDialog({
  lists = [],
  onCreated,
}: {
  lists?: ListOption[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [listId, setListId] = useState(NONE);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactCreateInput>({ resolver: zodResolver(contactCreateSchema) });

  async function onSubmit(values: ContactCreateInput) {
    try {
      await apiRequest('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ ...values, listIds: listId !== NONE ? [listId] : [] }),
      });
      toast.success('Contact added');
      reset();
      setListId(NONE);
      setOpen(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add contact');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" /> Add contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register('firstName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register('lastName')} />
            </div>
          </div>
          {lists.length > 0 && (
            <div className="space-y-1.5">
              <Label>Add to list (optional)</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue placeholder="No list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No list</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Add contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
