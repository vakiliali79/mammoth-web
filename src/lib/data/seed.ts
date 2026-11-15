import type { Category, GalleryImage, MenuItem, SiteData } from "./types";

/**
 * ⚠️ DEMO DATA — NOT THE REAL MENU OF MAMMOTH CAFE.
 *
 * Every product, description and price below is a placeholder so the site can
 * be previewed. Replace it from the admin panel (/admin) or by editing this
 * file before the first start. Contact details are intentionally left empty.
 * This seed is only written to the data store the first time the app runs.
 */

const cat = (id: string, nameFa: string, nameEn: string, order: number): Category => ({
  id,
  slug: id,
  nameFa,
  nameEn,
  order,
  visible: true,
});

export const seedCategories: Category[] = [
  cat("hot-coffee", "قهوه‌های گرم", "Hot Coffee", 1),
  cat("iced-coffee", "قهوه‌های سرد", "Iced Coffee", 2),
  cat("espresso-bar", "اسپرسو بار", "Espresso Bar", 3),
  cat("non-coffee", "نوشیدنی‌های غیرقهوه‌ای", "Non-Coffee Drinks", 4),
  cat("tea", "چای و دمنوش", "Tea & Infusions", 5),
  cat("shakes", "شیک و اسموتی", "Shakes & Smoothies", 6),
  cat("desserts", "کیک و دسر", "Cakes & Desserts", 7),
  cat("breakfast", "صبحانه و میان‌وعده", "Breakfast & Snacks", 8),
];

type SeedItem = [
  id: string,
  categoryId: string,
  nameFa: string,
  nameEn: string,
  descriptionFa: string,
  descriptionEn: string,
  price: number,
  image: string,
  flags?: { popular?: boolean; available?: boolean; variants?: MenuItem["variants"] },
];

const sizes = (small: number, large: number): MenuItem["variants"] => [
  { labelFa: "کوچک", labelEn: "Small", price: small },
  { labelFa: "بزرگ", labelEn: "Large", price: large },
];

const rows: SeedItem[] = [
  ["cappuccino", "hot-coffee", "کاپوچینو", "Cappuccino", "اسپرسو، شیر بخارداده‌شده و فوم مخملی", "Espresso, steamed milk and velvety foam", 120000, "cappuccino", { popular: true, variants: sizes(120000, 145000) }],
  ["latte", "hot-coffee", "لاته", "Caffè Latte", "اسپرسوی ملایم با شیر ابریشمی", "Mellow espresso with silky steamed milk", 125000, "latte", { variants: sizes(125000, 150000) }],
  ["flat-white", "hot-coffee", "فلت وایت", "Flat White", "دو شات ریسترتو با لایه نازک میکروفوم", "Double ristretto with a thin layer of microfoam", 130000, "flat-white", { popular: true }],
  ["mocha", "hot-coffee", "موکا", "Caffè Mocha", "اسپرسو، شکلات تلخ و شیر", "Espresso, dark chocolate and milk", 140000, "mocha"],
  ["pour-over", "hot-coffee", "قهوه دمی", "Pour Over", "دم‌آوری دستی با دانه تک‌خاستگاه", "Hand-brewed single-origin filter coffee", 150000, "pour-over"],

  ["iced-latte", "iced-coffee", "آیس لاته", "Iced Latte", "اسپرسو روی شیر سرد و یخ", "Espresso over cold milk and ice", 135000, "iced-latte", { popular: true }],
  ["cold-brew", "iced-coffee", "کلد برو", "Cold Brew", "عصاره‌گیری سرد و آهسته، طعمی شیرین و نرم", "Slow cold extraction — smooth and naturally sweet", 145000, "cold-brew"],
  ["iced-americano", "iced-coffee", "آیس آمریکانو", "Iced Americano", "اسپرسوی دوبل با آب سرد و یخ", "Double espresso with cold water and ice", 110000, "cold-brew", { available: false }],

  ["espresso", "espresso-bar", "اسپرسو", "Espresso", "شات کلاسیک با کرمای طلایی", "A classic shot with golden crema", 85000, "espresso", { popular: true, variants: [{ labelFa: "سینگل", labelEn: "Single", price: 85000 }, { labelFa: "دوبل", labelEn: "Double", price: 105000 }] }],
  ["americano", "espresso-bar", "آمریکانو", "Americano", "اسپرسو با آب داغ، بدنه‌ای سبک و شفاف", "Espresso lengthened with hot water", 95000, "americano"],
  ["macchiato", "espresso-bar", "ماکیاتو", "Macchiato", "اسپرسو با لکه‌ای از فوم شیر", "Espresso marked with a dash of milk foam", 100000, "macchiato"],

  ["hot-chocolate", "non-coffee", "هات چاکلت", "Hot Chocolate", "شکلات تلخ ذوب‌شده در شیر داغ", "Dark chocolate melted into hot milk", 130000, "hot-chocolate"],
  ["matcha-latte", "non-coffee", "ماچا لاته", "Matcha Latte", "چای سبز ماچا با شیر بخارداده‌شده", "Matcha green tea with steamed milk", 150000, "matcha", { popular: true }],

  ["black-tea", "tea", "چای سیاه", "Black Tea", "چای سیاه دم‌کشیده، سرو با نبات", "Freshly brewed black tea", 70000, "tea"],
  ["iced-tea", "tea", "آیس تی لیمو", "Lemon Iced Tea", "چای سرد با لیمو و نعنا", "Chilled tea with lime and mint", 95000, "iced-tea"],

  ["chocolate-shake", "shakes", "شیک شکلات", "Chocolate Shake", "بستنی وانیلی، شکلات و بیسکویت", "Vanilla ice cream, chocolate and cookie crumble", 165000, "milkshake", { popular: true }],
  ["berry-smoothie", "shakes", "اسموتی توت‌ها", "Berry Smoothie", "ترکیب توت‌های فصل، بدون شکر افزوده", "A blend of seasonal berries", 160000, "berry-smoothie"],
  ["strawberry-smoothie", "shakes", "اسموتی توت‌فرنگی", "Strawberry Smoothie", "توت‌فرنگی تازه و نعنا", "Fresh strawberry and mint", 155000, "strawberry-smoothie"],

  ["cheesecake", "desserts", "چیزکیک بلوبری", "Blueberry Cheesecake", "چیزکیک خامه‌ای با سس بلوبری", "Creamy cheesecake with blueberry compote", 150000, "cheesecake", { popular: true }],
  ["chocolate-cake", "desserts", "کیک شکلاتی", "Chocolate Cake", "کیک شکلات تلخ با گاناش", "Dark chocolate cake with ganache", 140000, "chocolate-cake"],
  ["tiramisu", "desserts", "تیرامیسو", "Tiramisu", "ماسکارپونه، اسپرسو و پودر کاکائو", "Mascarpone, espresso and cocoa", 155000, "tiramisu"],
  ["raspberry-cake", "desserts", "کیک تمشک", "Raspberry Cake", "کیک اسفنجی با خامه و تمشک تازه", "Sponge cake with cream and fresh raspberries", 145000, "raspberry-cake"],
  ["panna-cotta", "desserts", "پاناکوتا", "Panna Cotta", "دسر خامه‌ای با توت‌فرنگی", "Silky cream dessert with strawberries", 130000, "panna-cotta"],

  ["croissant", "breakfast", "کروسان کره‌ای", "Butter Croissant", "کروسان تازه، پخت روز", "Freshly baked, every day", 90000, "croissant", { popular: true }],
  ["egg-toast", "breakfast", "تست تخم‌مرغ و آووکادو", "Egg & Avocado Toast", "نان تست، آووکادو و نیمرو", "Toast, avocado and a fried egg", 185000, "egg-toast"],
  ["breakfast-plate", "breakfast", "بشقاب صبحانه", "Breakfast Plate", "نیمرو، نان تست و سبزیجات", "Fried egg, toast and vegetables", 210000, "breakfast-plate"],
];

export const seedItems: MenuItem[] = rows.map(
  ([id, categoryId, nameFa, nameEn, descriptionFa, descriptionEn, price, image, flags], i) => ({
    id,
    categoryId,
    nameFa,
    nameEn,
    descriptionFa,
    descriptionEn,
    price,
    image: `/images/menu/${image}.jpg`,
    available: flags?.available ?? true,
    popular: flags?.popular ?? false,
    order: i + 1,
    variants: flags?.variants ?? [],
  }),
);

const g = (
  name: string,
  altFa: string,
  altEn: string,
  order: number,
  size: GalleryImage["size"] = "normal",
): GalleryImage => ({ id: `g-${name}`, src: `/images/gallery/${name}.jpg`, altFa, altEn, order, size });

export const seedGallery: GalleryImage[] = [
  g("bar", "بار قهوه", "The coffee bar", 1, "wide"),
  g("latte-art-pour", "ریختن لاته آرت", "Pouring latte art", 2, "tall"),
  g("portafilter", "پرتافیلتر و قهوه آسیاب‌شده", "Portafilter and fresh grounds", 3),
  g("interior-garden", "فضای داخلی", "Interior", 4),
  g("croissants", "کروسان‌های تازه", "Fresh croissants", 5),
  g("roaster", "برشته‌کاری قهوه", "Coffee roasting", 6, "wide"),
  g("cups-hands", "فنجان‌های قهوه", "Cups of coffee", 7),
  g("interior-hall", "سالن کافه", "The hall", 8, "tall"),
  g("tools-flatlay", "ابزار اسپرسو", "Espresso tools", 9),
  g("window-table", "میز کنار پنجره", "A table by the window", 10, "wide"),
  g("cups-round", "سینی قهوه", "A round of coffees", 11),
];

export const seedData: SiteData = {
  version: 1,
  categories: seedCategories,
  items: seedItems,
  featuredIds: ["cappuccino", "espresso", "iced-latte", "cheesecake", "matcha-latte", "croissant"],
  gallery: seedGallery,
  settings: {
    // Real contact details are NOT invented — fill them in from /admin/settings.
    contact: {
      addressFa: "",
      addressEn: "",
      phone: "",
      instagram: "",
      email: "",
      mapUrl: "",
      latitude: null,
      longitude: null,
    },
    hours: [],
    demoMode: true,
  },
};
