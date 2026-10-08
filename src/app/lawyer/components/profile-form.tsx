"use client";

import { useState } from "react";

export type LawyerSelfFormValue = {
  fullName: string;
  slug: string;
  licenseNumber: string;
  city: string;
  province: string;
  bio: string;
  avatarUrl: string;
  specialtiesText: string;
  socialLinksText: string;
};

function parseSocialLinks(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("|");

      if (separator < 1) {
        throw new Error(
          "فرمت لینک‌ها باید platform|https://... باشد."
        );
      }

      return {
        platform: line.slice(0, separator).trim(),
        url: line.slice(separator + 1).trim()
      };
    });
}

export function LawyerSelfProfileForm({
  initial,
  exists
}: {
  initial: LawyerSelfFormValue;
  exists: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function setField<K extends keyof LawyerSelfFormValue>(
    key: K,
    value: LawyerSelfFormValue[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/lawyer/profile", {
        method: exists ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          slug: form.slug.trim().toLowerCase(),
          licenseNumber: form.licenseNumber.trim(),
          city: form.city.trim(),
          province: form.province.trim() || null,
          bio: form.bio.trim() || null,
          avatarUrl: form.avatarUrl.trim() || null,
          specialties: form.specialtiesText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          socialLinks: parseSocialLinks(form.socialLinksText)
        })
      });

      if (response.status === 401) {
        window.location.href =
          "/api/auth/signin?callbackUrl=/lawyer";
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "ذخیره پروفایل انجام نشد.");
      }

      setMessage(
        exists
          ? "پروفایل ذخیره شد."
          : "پروفایل ساخته شد و برای تأیید پروانه در انتظار بررسی ادمین است."
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>{exists ? "ویرایش پروفایل" : "ثبت پروفایل وکیل"}</h2>

      <p className="disclaimer">
        وضعیت تأیید و فعال/غیرفعال فقط توسط ادمین مدیریت می‌شود. اگر شماره
        پروانه را تغییر دهید، تأیید قبلی برای بررسی مجدد برداشته می‌شود.
      </p>

      <div className="form-grid">
        <label>
          نام و نام خانوادگی
          <input
            value={form.fullName}
            onChange={(event) =>
              setField("fullName", event.target.value)
            }
          />
        </label>

        <label>
          Slug
          <input
            value={form.slug}
            onChange={(event) =>
              setField("slug", event.target.value)
            }
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
            onChange={(event) =>
              setField("city", event.target.value)
            }
          />
        </label>

        <label>
          استان
          <input
            value={form.province}
            onChange={(event) =>
              setField("province", event.target.value)
            }
          />
        </label>

        <label>
          تصویر پروفایل
          <input
            value={form.avatarUrl}
            onChange={(event) =>
              setField("avatarUrl", event.target.value)
            }
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
        />
      </label>

      <label>
        معرفی
        <textarea
          rows={5}
          maxLength={5000}
          value={form.bio}
          onChange={(event) =>
            setField("bio", event.target.value)
          }
        />
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={
            saving ||
            form.fullName.trim().length < 2 ||
            form.slug.trim().length < 3 ||
            form.licenseNumber.trim().length < 2 ||
            form.city.trim().length < 2
          }
          onClick={() => void save()}
        >
          {saving
            ? "در حال ذخیره..."
            : exists
              ? "ذخیره تغییرات"
              : "ثبت و ارسال برای بررسی"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
