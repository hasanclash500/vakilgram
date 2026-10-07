"use client";

import { useState } from "react";

type LawyerInput = {
  id?: string;
  fullName: string;
  slug: string;
  licenseNumber: string;
  city: string;
  province: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  active: boolean;
  specialtiesText: string;
  socialLinksText: string;
};

const EMPTY: LawyerInput = {
  fullName: "",
  slug: "",
  licenseNumber: "",
  city: "",
  province: "",
  bio: "",
  avatarUrl: "",
  verified: false,
  active: true,
  specialtiesText: "",
  socialLinksText: ""
};

function parseSocialLinks(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");
      if (separator < 1) {
        throw new Error("فرمت لینک‌ها باید platform|https://... باشد.");
      }

      return {
        platform: line.slice(0, separator).trim(),
        url: line.slice(separator + 1).trim()
      };
    });
}

function payloadFromForm(form: LawyerInput) {
  return {
    fullName: form.fullName.trim(),
    slug: form.slug.trim().toLowerCase(),
    licenseNumber: form.licenseNumber.trim() || null,
    city: form.city.trim(),
    province: form.province.trim() || null,
    bio: form.bio.trim() || null,
    avatarUrl: form.avatarUrl.trim() || null,
    verified: form.verified,
    active: form.active,
    specialties: form.specialtiesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    socialLinks: parseSocialLinks(form.socialLinksText)
  };
}

function LawyerEditor({
  initial,
  onSaved
}: {
  initial: LawyerInput;
  onSaved?: (value: LawyerInput) => void;
}) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof LawyerInput>(
    field: K,
    value: LawyerInput[K]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        form.id ? "/api/admin/lawyers/" + form.id : "/api/admin/lawyers",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payloadFromForm(form))
        }
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "ذخیره پروفایل انجام نشد.");
      }

      const lawyer = body.lawyer;
      const saved: LawyerInput = {
        id: lawyer.id,
        fullName: lawyer.fullName,
        slug: lawyer.slug,
        licenseNumber: lawyer.licenseNumber ?? "",
        city: lawyer.city,
        province: lawyer.province ?? "",
        bio: lawyer.bio ?? "",
        avatarUrl: lawyer.avatarUrl ?? "",
        verified: lawyer.verified,
        active: lawyer.active,
        specialtiesText: lawyer.specialties
          .map((item: { area: string }) => item.area)
          .join(", "),
        socialLinksText: lawyer.socialLinks
          .map(
            (item: { platform: string; url: string }) =>
              item.platform + "|" + item.url
          )
          .join("\n")
      };

      setForm(saved);
      onSaved?.(saved);
      setStatus("ذخیره شد.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-editor">
      <div className="form-grid">
        <label>
          نام و نام خانوادگی
          <input
            value={form.fullName}
            onChange={(event) => setField("fullName", event.target.value)}
          />
        </label>

        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) => setField("slug", event.target.value)}
            placeholder="ali-ahmadi"
          />
        </label>

        <label>
          شماره پروانه
          <input
            value={form.licenseNumber}
            onChange={(event) =>
              setField("licenseNumber", event.target.value)
            }
          />
        </label>

        <label>
          شهر
          <input
            value={form.city}
            onChange={(event) => setField("city", event.target.value)}
          />
        </label>

        <label>
          استان
          <input
            value={form.province}
            onChange={(event) => setField("province", event.target.value)}
          />
        </label>

        <label>
          تصویر پروفایل
          <input
            value={form.avatarUrl}
            onChange={(event) => setField("avatarUrl", event.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      <label>
        تخصص‌ها (با کاما جدا کنید)
        <input
          value={form.specialtiesText}
          onChange={(event) =>
            setField("specialtiesText", event.target.value)
          }
          placeholder="خانواده، قراردادها، کیفری"
        />
      </label>

      <label>
        لینک‌ها؛ هر خط platform|URL
        <textarea
          rows={4}
          value={form.socialLinksText}
          onChange={(event) =>
            setField("socialLinksText", event.target.value)
          }
          placeholder={"website|https://example.com\ntelegram|https://t.me/..."}
        />
      </label>

      <label>
        معرفی
        <textarea
          rows={5}
          maxLength={5000}
          value={form.bio}
          onChange={(event) => setField("bio", event.target.value)}
        />
      </label>

      <div className="status-controls">
        <label>
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(event) =>
              setField("verified", event.target.checked)
            }
          />
          تأییدشده
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setField("active", event.target.checked)}
          />
          فعال
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          disabled={
            saving ||
            form.fullName.trim().length < 2 ||
            form.city.trim().length < 2 ||
            form.slug.trim().length < 3
          }
          onClick={() => void save()}
        >
          {saving ? "در حال ذخیره..." : form.id ? "ذخیره تغییرات" : "ساخت وکیل"}
        </button>
        {status && <small>{status}</small>}
      </div>
    </article>
  );
}

export function NewLawyerForm() {
  const [key, setKey] = useState(0);

  return (
    <section className="assistant-card">
      <h2>افزودن وکیل</h2>
      <LawyerEditor
        key={key}
        initial={{ ...EMPTY }}
        onSaved={() => setKey((current) => current + 1)}
      />
    </section>
  );
}

export function ExistingLawyerEditor({
  lawyer
}: {
  lawyer: LawyerInput;
}) {
  return <LawyerEditor initial={lawyer} />;
}
