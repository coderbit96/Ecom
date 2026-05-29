"use client";

import { useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  Edit2,
  Home,
  Loader2,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export type ProfileAddress = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type LoginHistoryEntry = {
  id: string;
  date: string;
  time: string;
  device: string;
  browser: string;
  ip: string;
};

type ProfileViewProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
    phone: string;
  };
  addresses: ProfileAddress[];
  loginHistory: LoginHistoryEntry[];
};

type AddressFormState = Omit<ProfileAddress, "id"> & {
  id?: string;
};

const emptyAddress: AddressFormState = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export function ProfileView({
  user,
  addresses: initialAddresses,
  loginHistory,
}: ProfileViewProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [addressModal, setAddressModal] = useState<AddressFormState | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const avatarLabel = user.name || user.email || "User";

  async function saveProfile() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phone }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save profile.");
      }

      setMessage("Profile changes saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAddress(address: AddressFormState) {
    const isEdit = Boolean(address.id);
    const response = await fetch(
      isEdit ? `/api/user/addresses/${address.id}` : "/api/user/addresses",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(address),
      }
    );
    const payload = (await response.json().catch(() => null)) as {
      address?: ProfileAddress;
      error?: string;
    } | null;

    if (!response.ok || !payload?.address) {
      throw new Error(payload?.error ?? "Unable to save address.");
    }

    setAddresses((current) => {
      const next = isEdit
        ? current.map((item) => (item.id === payload.address?.id ? payload.address : item))
        : [payload.address!, ...current];

      return payload.address!.isDefault
        ? next.map((item) => ({
            ...item,
            isDefault: item.id === payload.address!.id,
          }))
        : next;
    });
    setAddressModal(null);
  }

  async function deleteAddress(id: string) {
    const response = await fetch(`/api/user/addresses/${id}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      setAddresses((current) => current.filter((address) => address.id !== id));
    }
  }

  async function setDefaultAddress(id: string) {
    const response = await fetch(`/api/user/addresses/${id}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "set-default" }),
    });

    if (response.ok) {
      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address.id === id,
        }))
      );
    }
  }

  async function deleteAccount() {
    if (deleteText !== "DELETE") return;

    setIsDeletingAccount(true);

    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Unable to delete account.");
      }

      await signOut({ callbackUrl: "/login" });
    } catch {
      setMessage("Unable to delete account right now.");
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-md bg-[#f8fafc] p-6 text-center">
          <div className="relative size-24 overflow-hidden rounded-full bg-[#e2e8f0]">
            {user.image ? (
              <Image
                src={user.image}
                alt={avatarLabel}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full items-center justify-center text-3xl font-bold text-[#475569]">
                {avatarLabel.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#0f172a]">
            {user.name || "Your Profile"}
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">{user.email}</p>
          <p className="mt-3 rounded bg-white px-3 py-1 text-xs font-semibold text-[#475569]">
            Google account
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Profile Details
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Gmail avatar and email are read-only. You can edit your display name
              and phone number.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Email" value={user.email} />
            <ReadOnlyField label="Google avatar" value="Synced from Google" />
            <TextField label="Display name" value={name} onChange={setName} />
            <TextField label="Phone number" value={phone} onChange={setPhone} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f59e0b] px-4 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] disabled:opacity-60"
              onClick={saveProfile}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </button>
            {message ? <p className="text-sm text-[#64748b]">{message}</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">Address Book</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Manage delivery addresses used during checkout.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f172a] px-4 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
            onClick={() => setAddressModal(emptyAddress)}
          >
            <Plus className="h-4 w-4" />
            Add New Address
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {addresses.length ? (
            addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-lg border border-[#e2e8f0] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
                      <Home className="h-4 w-4 text-[#f59e0b]" />
                      {address.label}
                    </h3>
                    {address.isDefault ? (
                      <span className="ml-2 rounded bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]">
                        Default
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#64748b]">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  <br />
                  {address.city}, {address.state} {address.pincode}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconButton label="Edit" onClick={() => setAddressModal(address)}>
                    <Edit2 className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => deleteAddress(address.id)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                  {!address.isDefault ? (
                    <button
                      type="button"
                      className="h-9 rounded-md border border-[#cbd5e1] px-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[#f8fafc]"
                      onClick={() => setDefaultAddress(address.id)}
                    >
                      Set Default
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#cbd5e1] px-6 py-10 text-center md:col-span-2">
              <MapPin className="mx-auto h-8 w-8 text-[#94a3b8]" />
              <h3 className="mt-3 text-sm font-semibold text-[#0f172a]">
                No saved addresses
              </h3>
              <p className="mt-1 text-sm text-[#64748b]">
                Add an address to speed up checkout.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#f59e0b]" />
          <h2 className="text-lg font-semibold text-[#0f172a]">
            Account Security
          </h2>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-[#e2e8f0]">
          <div className="hidden grid-cols-5 bg-[#f8fafc] px-4 py-3 text-xs font-semibold uppercase text-[#64748b] md:grid">
            <span>Date</span>
            <span>Time</span>
            <span>Device</span>
            <span>Browser</span>
            <span>IP</span>
          </div>
          <div className="divide-y divide-[#e2e8f0]">
            {loginHistory.length ? (
              loginHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 px-4 py-3 text-sm text-[#475569] md:grid-cols-5"
                >
                  <span>{entry.date}</span>
                  <span>{entry.time}</span>
                  <span>{entry.device}</span>
                  <span>{entry.browser}</span>
                  <span>{entry.ip}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[#64748b]">
                Login history will appear after your next sign-in.
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[#991b1b]">
                <AlertTriangle className="h-4 w-4" />
                Delete My Account
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f1d1d]">
                This anonymizes your profile data, removes sessions and wishlist,
                and cancels active orders.
              </p>
            </div>
            <button
              type="button"
              className="h-10 rounded-md bg-[#991b1b] px-4 text-sm font-semibold text-white"
              onClick={() => setDeleteModalOpen(true)}
            >
              Delete My Account
            </button>
          </div>
        </div>
      </section>

      {addressModal ? (
        <AddressModal
          address={addressModal}
          onClose={() => setAddressModal(null)}
          onSave={saveAddress}
        />
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Confirm account deletion
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#64748b]">
              Type DELETE to confirm. Your profile will be anonymized, active
              orders cancelled, and wishlist/session data removed.
            </p>
            <input
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              className="mt-4 h-10 w-full rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#dc2626]"
              placeholder="DELETE"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a]"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteText !== "DELETE" || isDeletingAccount}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#991b1b] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={deleteAccount}
              >
                {isDeletingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      <input
        value={value}
        readOnly
        className="h-10 w-full rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 text-sm text-[#64748b]"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-[#cbd5e1] px-3 text-sm outline-none focus:border-[#f59e0b]"
      />
    </label>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-9 items-center justify-center rounded-md border border-[#cbd5e1] text-[#475569] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AddressModal({
  address,
  onClose,
  onSave,
}: {
  address: AddressFormState;
  onClose: () => void;
  onSave: (address: AddressFormState) => Promise<void>;
}) {
  const [form, setForm] = useState(address);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isValid =
    form.label.trim() &&
    form.line1.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    PINCODE_REGEX.test(form.pincode);

  async function submit() {
    if (!isValid) {
      setError("Fill all required fields and enter a valid pincode.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(form);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save address.");
    } finally {
      setIsSaving(false);
    }
  }

  const setField = <Key extends keyof AddressFormState>(
    key: Key,
    value: AddressFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-[#0f172a]">
          {form.id ? "Edit Address" : "Add New Address"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField
            label="Label"
            value={form.label}
            onChange={(value) => setField("label", value)}
          />
          <TextField
            label="Pincode"
            value={form.pincode}
            onChange={(value) =>
              setField("pincode", value.replace(/\D/g, "").slice(0, 6))
            }
          />
          <TextField
            label="Address line 1"
            value={form.line1}
            onChange={(value) => setField("line1", value)}
          />
          <TextField
            label="Address line 2"
            value={form.line2 ?? ""}
            onChange={(value) => setField("line2", value)}
          />
          <TextField
            label="City"
            value={form.city}
            onChange={(value) => setField("city", value)}
          />
          <TextField
            label="State"
            value={form.state}
            onChange={(value) => setField("state", value)}
          />
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => setField("isDefault", event.target.checked)}
            className="size-4 rounded border-[#cbd5e1]"
          />
          Set as default
        </label>
        {error ? <p className="mt-3 text-sm text-[#991b1b]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-[#cbd5e1] px-4 text-sm font-semibold text-[#0f172a]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f59e0b] px-4 text-sm font-bold text-[#111827] disabled:opacity-60"
            onClick={submit}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Address
          </button>
        </div>
      </div>
    </div>
  );
}
