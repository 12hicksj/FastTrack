"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface Vehicle {
  vehicleId: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  value: string;
}

interface UploadedPhoto {
  url: string;
  filename: string;
  photoTypeName: string;
}

const PHOTO_TYPES = ["front", "rear", "left_side", "right_side", "detail"];

function assignPhotoType(index: number): string {
  return PHOTO_TYPES[index] ?? "detail";
}

export default function NewClaimPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehicleId, setVehicleId] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => fetch("/api/vehicles").then((r) => r.json()),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const newPhotos: UploadedPhoto[] = [];
      for (const file of files) {
        const index = photos.length + newPhotos.length;
        const photoTypeName = assignPhotoType(index);
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        newPhotos.push({ url: blob.url, filename: file.name, photoTypeName });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch {
      toast.error("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length < 4) {
      toast.error("Please upload at least 4 photos before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: parseInt(vehicleId),
          incidentDate,
          incidentDescription: description,
          photos: photos.map((p) => ({ url: p.url, photoTypeName: p.photoTypeName })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }

      const { claimId } = await res.json();
      toast.success("Claim submitted successfully.");
      router.push(`/claims/${claimId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const photoLabels = ["Front", "Rear", "Left side", "Right side"];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Claim</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Report a vehicle damage claim and upload photos for AI assessment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="vehicle">Select vehicle</Label>
              <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")} required>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Choose a vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.vehicleId} value={String(v.vehicleId)}>
                      {v.year} {v.make} {v.model} — {v.vin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Incident details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Incident details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incident-date">Date of incident</Label>
              <Input
                id="incident-date"
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                required
                minLength={10}
                maxLength={2000}
                placeholder="Describe what happened and where the damage is…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Photos
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({photos.length} uploaded · minimum 4 required)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload at least 4 photos: front, rear, left side, right side. Add close-ups of damaged areas as needed.
            </p>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
                    <img src={p.url} alt={p.filename} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="rounded-full bg-white/90 p-1 hover:bg-white"
                      >
                        <X className="h-4 w-4 text-gray-800" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-[10px] text-white truncate">
                        {photoLabels[i] ?? `Detail ${i - 3}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
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
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 animate-pulse" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    Add photos
                  </>
                )}
              </Button>
            </div>

            {photos.length < 4 && photos.length > 0 && (
              <p className="text-sm text-amber-600">
                Add {4 - photos.length} more photo{4 - photos.length === 1 ? "" : "s"} to continue.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || uploading || !vehicleId || !incidentDate || description.length < 10 || photos.length < 4}
          >
            {submitting ? "Submitting…" : "Submit claim"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
