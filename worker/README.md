# Storybook Gift Cloudflare Worker

Worker ini harus memakai resource terpisah dari Birthday Scrapbook.

## Bindings

- `GIFT_KV`: KV khusus config project, Studio draft, dan idempotency mapping.
- `MEDIA_BUCKET`: bucket R2 For You Always yang sudah ada.

Media Storybook terisolasi pada:

```text
storybook/{projectId}/photos/...
storybook/{projectId}/videos/...
storybook/{projectId}/audio/...
```

Permanent delete hanya menghapus prefix project tersebut.

## Setup resource

```text
npx wrangler kv namespace create GIFT_KV
```

Masukkan ID namespace baru ke `wrangler.toml`. `bucket_name` harus berupa nama bucket R2, bukan hostname CDN.

Simpan secret lewat Cloudflare, jangan menulis nilainya di repository:

```text
npx wrangler secret put PROJECT_SIGNING_SECRET
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put INTERNAL_GENERATOR_SECRET
```

Ketiga secret harus berbeda. Jangan mengganti `PROJECT_SIGNING_SECRET` setelah project dibuat karena project ID dan magic edit token diturunkan secara deterministik dari secret tersebut.

## Generator contract

```text
POST /api/internal/projects
Authorization: Bearer INTERNAL_GENERATOR_SECRET
Content-Type: application/json

{
  "source": "pakasir",
  "idempotencyKey": "ORDER-123:storybook",
  "project": {}
}
```

`project` bersifat opsional. Kombinasi `source` dan `idempotencyKey` yang sama selalu mengembalikan project yang sama:

```json
{
  "created": true,
  "projectId": "gift-...",
  "studioUrl": "https://.../studio/gift-...#token=...",
  "giftUrl": "https://.../gift/gift-..."
}
```

## Endpoint

- `GET /api/health`
- `GET /api/gift/:projectId`
- `GET /api/studio/:projectId`
- `PUT /api/studio/:projectId`
- `POST /api/upload`
- `GET|POST /api/admin/projects`
- `PATCH|DELETE /api/admin/projects/:projectId`
- `POST /api/internal/projects`

Semua endpoint Studio memakai magic bearer token. Seluruh endpoint Admin memakai `ADMIN_SECRET`. Internal generator memakai `INTERNAL_GENERATOR_SECRET`.

Payload JSON dibatasi maksimal 1 MB. Upload media memiliki batas terpisah sesuai jenis file. Origin production dibatasi ke domain Storybook dan subdomain `for-you-always.my.id`; preview deployment harus memakai Worker/environment preview terpisah.

## Urutan release nanti

1. Jalankan test root project.
2. Isi KV namespace dan origin production.
3. Tambahkan secrets.
4. Deploy Worker.
5. Periksa `/api/health` mengembalikan schema `2` dan theme `spiderman` serta `batman`.
6. Deploy frontend setelah Worker lolos smoke test.

Tidak ada perintah deploy yang dijalankan otomatis oleh project ini.
