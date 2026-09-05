# SOLÉA.Co

Black-and-blush nail atelier concept using the supplied exact logo and reversible scroll-controlled footage.

## Run

- `npm install`
- `npm run dev` — local preview at http://localhost:3000
- `npm run build` — production bundle
- `npx tsc --noEmit` — type check
- `node scripts/check-site.cjs` — browser smoke check; requires Playwright in the environment and installed Chrome. No test-only package is added to the site.

## Motion

121 WebP frames extracted at 15 fps, 960×540, from the supplied 8-second film. Total approximately 1.4 MB. Native canvas rendering interpolates scroll progress with a 65 ms response time, four concurrent fetches, and a maximum of 18 decoded bitmaps (about 36 MB). Released bitmaps are closed. No autoplay, scroll interception, or animation library. Reduced-motion users get a static hero without the pinned scroll distance. Failed frame loading leaves the poster/last good frame visible.

Original video is retained locally in ignored `work/solea-original.mp4`; production only serves the optimized sequence. The image uses its natural ivory background in an editorial arch rather than artificial black compositing.

## Content to connect before a public launch

Booking deliberately shows a coming-soon dialog: no business booking URL, location, hours, prices, or confirmed service catalogue were supplied. No personal information is collected and no fake booking is created. Replace the dialog with the real booking destination when available.

The interior is explicitly labelled atmosphere inspiration, not represented as SOLÉA.Co's premises. It is a design-reference image from Diamond Nails / Total Fitouts; commercial reuse permission has not been established. Replace with the actual salon's authorized photography before public launch. The site is published privately for review.

## Assets

- `solea-logo.jpg`: exact user-supplied artwork, displayed by CSS viewport cropping of blank margins; colors and geometry unchanged.
- `ombre-nails.jpg`: user-supplied manicure reference.
- `frames/`: supplied Higgsfield film, original URL in task context.
- `manicure-natural.jpg`: Kaboompics, https://www.pexels.com/photo/woman-doing-manicure-5238090/ (page marked free to use).
- `manicure-detail.jpg`: Gabriel Puyén, https://www.pexels.com/photo/photo-of-a-person-s-hand-getting-a-manicure-6135675/ (page marked free to use).
- `manicure-pink.jpg`: Element5 Digital, https://www.pexels.com/photo/woman-s-pink-pedicure-973405/ (page marked free to use).
- `nail-salon-reference.jpg`: https://www.totalfitouts.com.au/wp-content/uploads/2024/03/Diamond-Nails-Sunny-Coast-South6.jpg (inspiration/reference only).
- Typography: Cormorant Garamond, Allura, and DM Sans via Google Fonts, with system fallbacks.

## Verification

Browser checks cover forward/reverse frames, pause, booking dialog and Escape dismissal, 390/320 px overflow, reduced motion and failed-frame poster fallback. Build and TypeScript checks pass. Desktop/mobile screenshots are kept locally under ignored `outputs/`.
