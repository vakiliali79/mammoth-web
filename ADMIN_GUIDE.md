# Admin guide — MAMMOTH CAFE

The admin panel lives at **`/admin`** (Persian interface). Everything you change is live on
the site immediately.

## 1. First-time setup

There is no default password. On the server, inside the project folder:

```bash
npm run admin:setup
```

Enter a username and a password (at least 10 characters). The script stores only a **hash**
of the password in `.env` and generates a session secret. Restart the app afterwards
(`pm2 reload mammoth-cafe`). Run the same command again whenever you want to change the
password — doing so signs out every existing session.

Security notes:

- Sessions last 12 hours and live in an httpOnly cookie that only works under `/admin`.
- After 5 wrong passwords from one address, login is blocked for 15 minutes.
- Always use the panel over HTTPS.

## 2. Replace the demo content (recommended order)

1. **دسته‌بندی‌ها (Categories)** — rename, reorder, hide or add categories. The `slug` is the
   short English id used in links (`/menu#hot-coffee`). A category can only be deleted once it
   has no products.
2. **محصولات منو (Products)** — delete the demo products or edit them into real ones.
3. **منتخب صفحه اصلی (Featured)** — choose which products appear on the homepage.
4. **گالری (Gallery)** — replace the stock photos with real photos of the cafe.
5. **تماس و ساعات کاری (Contact & hours)** — address, phone, Instagram, map, opening hours.
6. On the same page, untick **حالت نمایشی (demo mode)** to remove the "demo version" notes.

## 3. Products

**Add:** محصولات منو → «+ محصول جدید».

| Field | Notes |
| --- | --- |
| نام فارسی * | Shown on the Persian site |
| نام انگلیسی | Shown under the Persian name and on `/en` (falls back to Persian if empty) |
| توضیح | Short description, max 400 characters |
| دسته‌بندی * | Which menu section it belongs to |
| قیمت پایه (تومان) * | Whole number in Toman, e.g. `125000` |
| ترتیب نمایش | Smaller numbers appear first inside the category |
| موجود است | Untick to show the product greyed-out with a «ناموجود» label |
| برچسب «محبوب» | Adds the "popular" badge |
| تصویر محصول | JPG/PNG/WebP/AVIF up to 8 MB. Resized and converted to WebP automatically. Square-ish photos work best |
| اندازه‌ها / انتخاب‌ها | Optional sizes (e.g. کوچک / بزرگ) each with its own price. When present they replace the base price on the menu |

**Quick actions in the product table:**

- Change a price: type the new number and press «ثبت».
- Enable/disable a product: the «موجود» switch.
- Toggle the "popular" badge: the «محبوب» switch.
- «ویرایش» opens the full form; «حذف» deletes the product (and its uploaded image).

## 4. Featured products (homepage)

Tick up to 12 products and give each an order number (1 = first). Unavailable products are
skipped on the homepage automatically.

## 5. Gallery

Upload an image, add a short description (used as alt text for accessibility and SEO), pick
an order and a layout size (معمولی / عریض / بلند). Deleting an image also removes the file.

## 6. Contact details & working hours

- **نشانی، تلفن، اینستاگرام، ایمیل** — empty fields show «به‌زودی اعلام می‌شود» on the site.
- **لینک مسیریابی** — a Google Maps / Neshan / Balad link for the "open in maps" button.
- **Latitude / longitude** — when both are filled, an embedded OpenStreetMap map with a pin is
  shown. (In Google Maps: right-click the cafe → the first row is `latitude, longitude`.)
- **ساعات کاری** — add one row per group of days, e.g. «شنبه تا چهارشنبه» 08:00–23:00.
  Tick «تعطیل» for closed days.

These values also feed the search-engine structured data.

## 7. What is not editable in the panel

The headline and editorial paragraphs (hero captions, "قهوه خوب، اتفاقی نیست", the three
coffee-experience chapters) live in `src/lib/i18n/fa.ts` and `en.ts`. The editorial photos of
those sections are in `public/images/editorial/`. Editing them needs a rebuild and deploy.

## 8. Backups

All content is in the data folder (`DATA_DIR`, default `./data`):

- `store.json` — menu, categories, gallery list, settings
- `uploads/` — uploaded images

Back it up with e.g. `tar czf mammoth-data-$(date +%F).tar.gz -C /var/lib/mammoth-cafe .`
To restore, put the files back and reload the app.

To start again from the demo data, stop the app, delete `store.json`, and start it again.
