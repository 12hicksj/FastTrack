"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ImageIcon, Loader2 } from "lucide-react";
import { BP } from "@/lib/api-path";

interface DemoUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Vehicle {
  vehicleId: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  value: string;
  licensePlate?: string | null;
  customerId?: number;
}

interface UploadedPhoto {
  url: string;
  filename: string;
  photoTypeName: string;
}

const PHOTO_TYPES = ["front", "rear", "left_side", "right_side", "detail"];
const PHOTO_LABELS = ["Front", "Rear", "Left side", "Right side"];

function SectionHeader({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold mt-0.5">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm font-medium font-mono">{value}</dd>
    </div>
  );
}

export default function NewClaimPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();

  const isAgent =
    session?.role === "agent" || session?.role === "supervisor";

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // All users — filter to customers for the agent customer-selector
  const { data: allUsers } = useQuery<DemoUser[]>({
    queryKey: ["demo-users"],
    queryFn: () => fetch(`${BP}/api/users`).then((r) => r.json()),
    enabled: isAgent,
    staleTime: Infinity,
  });
  const customers = allUsers?.filter((u) => u.role === "customer") ?? [];

  // All vehicles for the current session
  const { data: allVehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => fetch(`${BP}/api/vehicles`).then((r) => r.json()),
  });

  // For agents, filter by selected customer; customers see all their own
  const vehicles =
    isAgent && customerId
      ? (allVehicles ?? []).filter(
          (v) => String(v.customerId) === customerId
        )
      : isAgent
        ? []
        : (allVehicles ?? []);

  const selectedVehicle = vehicles.find((v) => String(v.vehicleId) === vehicleId);

  // Reset vehicle when customer changes; track name for trigger display
  function handleCustomerChange(val: string | null) {
    const id = val ?? "";
    setCustomerId(id);
    setVehicleId("");
    setVehicleName("");
    const c = customers.find((u) => String(u.userId) === id);
    setCustomerName(c ? `${c.firstName} ${c.lastName}` : "");
  }

  function handleVehicleChange(val: string | null) {
    const id = val ?? "";
    setVehicleId(id);
    const v = vehicles.find((v) => String(v.vehicleId) === id);
    setVehicleName(v ? `${v.year} ${v.make} ${v.model}` : "");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      const newPhotos: UploadedPhoto[] = [];
      for (const file of files) {
        const index = photos.length + newPhotos.length;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const safeName = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const blob = await upload(safeName, file, {
          access: "public",
          handleUploadUrl: `${BP}/api/upload`,
          contentType: file.type || "image/jpeg",
        });
        newPhotos.push({
          url: blob.url,
          filename: file.name,
          photoTypeName: PHOTO_TYPES[index] ?? "detail",
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length < 4) {
      toast.error("Upload at least 4 photos before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BP}/api/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: parseInt(vehicleId),
          incidentDate,
          incidentDescription: description,
          photos: photos.map((p) => ({
            url: p.url,
            photoTypeName: p.photoTypeName,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }
      const { claimId } = await res.json();
      toast.success("Claim submitted and assessed.");
      router.push(`/claims/${claimId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const photosMissing = Math.max(0, 4 - photos.length);
  const canSubmit =
    vehicleId &&
    incidentDate &&
    description.length >= 10 &&
    photos.length >= 4 &&
    !uploading &&
    !submitting;

  const stepOffset = isAgent ? 0 : -1; // agents have an extra step

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">New claim</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Report a vehicle damage incident and upload photos for AI assessment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Step 1: Customer (agents/supervisors only) ── */}
        {isAgent && (
          <div>
            <SectionHeader
              step={1}
              title="Customer"
              subtitle="Select the policyholder making this claim"
            />
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-xs text-muted-foreground">
                Policyholder
              </Label>
              <Select
                value={customerId || undefined}
                onValueChange={handleCustomerChange}
              >
                <SelectTrigger id="customer" className="w-full">
                  {customerId && customerName ? (
                    <span className="flex flex-1 text-left text-sm">
                      {customerName}
                    </span>
                  ) : (
                    <SelectValue placeholder="Select a customer…" />
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {customers.map((c) => (
                    <SelectItem key={c.userId} value={String(c.userId)}>
                      <span className="flex flex-col gap-0.5 py-0.5">
                        <span className="text-sm font-medium leading-none">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground leading-none">
                          {c.email}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ── Step 2: Vehicle ── */}
        <div>
          <SectionHeader
            step={isAgent ? 2 : 1}
            title="Vehicle"
            subtitle={
              isAgent
                ? "Select a vehicle registered to this customer"
                : "Select your registered vehicle"
            }
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle" className="text-xs text-muted-foreground">
                Registered vehicle
              </Label>
              <Select
                value={vehicleId || undefined}
                onValueChange={handleVehicleChange}
                disabled={isAgent && !customerId}
              >
                <SelectTrigger id="vehicle" className="w-full">
                  {vehicleId && vehicleName ? (
                    <span className="flex flex-1 text-left text-sm">
                      {vehicleName}
                    </span>
                  ) : (
                    <SelectValue
                      placeholder={
                        isAgent && !customerId
                          ? "Select a customer first"
                          : "Select a vehicle…"
                      }
                    />
                  )}
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {vehicles.map((v) => (
                    <SelectItem key={v.vehicleId} value={String(v.vehicleId)}>
                      {v.year} {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVehicle && (
              <dl className="grid grid-cols-2 sm:grid-cols-6 gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <FieldGroup label="Year" value={String(selectedVehicle.year)} />
                <FieldGroup label="Make" value={selectedVehicle.make} />
                <FieldGroup label="Model" value={selectedVehicle.model} />
                <FieldGroup label="VIN" value={selectedVehicle.vin} className="col-span-2" />
                <FieldGroup label="Plate" value={selectedVehicle.licensePlate ?? "—"} />
              </dl>
            )}
          </div>
        </div>

        {/* ── Step 3: Incident details ── */}
        <div>
          <SectionHeader
            step={isAgent ? 3 : 2}
            title="Incident details"
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="incident-date"
                className="text-xs text-muted-foreground"
              >
                Date of incident
              </Label>
              <Input
                id="incident-date"
                type="date"
                required
                max={today}
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-fit"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-xs text-muted-foreground"
              >
                Description
              </Label>
              <Textarea
                id="description"
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Describe what happened and where the damage is located…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length} / 2000
              </p>
            </div>
          </div>
        </div>

        {/* ── Step 4: Photos ── */}
        <div>
          <SectionHeader
            step={isAgent ? 4 : 3}
            title="Photos"
            subtitle="Upload at least 4 photos: front, rear, left side, right side. Add detail shots of each damaged area."
          />

          <div className="space-y-4">
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                  >
                    <img
                      src={p.url}
                      alt={p.filename}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5">
                      <p className="text-[9px] text-white truncate">
                        {PHOTO_LABELS[i] ?? `Detail ${i - 3}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                {uploading ? "Uploading…" : "Add photos"}
              </Button>
              {photosMissing > 0 && photos.length > 0 && (
                <p className="text-xs text-amber-600">
                  {photosMissing} more photo{photosMissing !== 1 ? "s" : ""}{" "}
                  needed
                </p>
              )}
              {photos.length >= 4 && (
                <p className="text-xs text-muted-foreground">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} ready
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button type="submit" disabled={!canSubmit} size="sm">
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing photos…
              </>
            ) : (
              "Submit claim"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
