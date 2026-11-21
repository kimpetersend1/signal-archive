# SIGNAL//ARCHIVE

A cinematic, mobile-first, one-page wallpaper-sharing site built with vanilla HTML, CSS and JavaScript, Vite, Supabase and Netlify. Public users can browse and download approved wallpapers. Registered members can submit their own work. One owner/admin reviews submissions before public release and can manage content reports.

## What has been implemented

- Original responsive editorial design, navigation, hero, about, CSS-columns masonry gallery, lightbox with keyboard controls, direct downloads, join and contact, footer.
- Eight original, locally authored SVG sample wallpapers, available for preview and download.
- Registration, sign-in, email verification, password reset, logout and account dialog using Supabase Auth.
- Authenticated JPG/PNG/WEBP/AVIF image upload with preview, dimensions/size checks, rights attestation, private staging, and submission history.
- Pending approval moderation queue and admin-only Netlify Function. Files are checked and copied to public storage after approval. Report queue, resolution controls, and an administrator takedown action for published files.
- Supabase SQL migration with Auth profile creation, RLS, private/public buckets, and upload restrictions.
- Netlify Forms contact submission, SEO metadata, responsive CSS and reduced-motion support.

## Rights to the supplied reference image — IMPORTANT

The user-provided `reference/wallhaven-jel1jq.jpg` is **NOT included in the public production bundle**. Both `reference/` and `offline-preview.html` are `.gitignore`d so an ordinary Git commit will not inadvertently publish the unverified source image. Its rights are not confirmed. It appears in **local Vite development only** via a development-server-only route (`/__local_reference/...`) in the hero and as an undownloadable preview gallery entry. For production, the hero falls back to an original SVG asset. There is no way to expose the reference image in the production site without first verifying the right to publish and distribute it and consciously modifying the code. Do not copy the reference into `public/` unless you have verified those rights.

The project's original SVG samples can be used for testing as visual placeholders. They are clearly identified in the gallery as sample artwork.

## Local installation

Requirements: Node.js 22 or newer and npm. Install from the project root:

```bash
npm install
cp .env.example .env
npm run dev
```

Open the localhost URL printed by Vite. You can also open `offline-preview.html` directly in a browser to inspect the visual direction without npm; it is a private, self-contained design review and **NOT** part of the Netlify production build. It includes the rights-unverified uploaded image and must not be publicly hosted. Public gallery preview works without setting Supabase credentials; authentication and uploading need a configured project. If the image reference is missing, the local reference route returns 404; use the default hero SVG.

### Configuring Supabase

1. Create a Supabase project that you control.
2. In Supabase SQL Editor, apply `supabase/migrations/001_archive.sql` **once** to create tables, policies, triggers, storage buckets and reports. Read it first if using an existing project. Policies are intentionally restrictive.
3. In Supabase Auth URL Configuration, configure your local development and final Netlify URL as authorized redirect URLs. Enable email confirmation and configure an appropriate SMTP provider for production (Supabase's default test email delivery has restrictions).
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` for local development and in Netlify environment variables for production. These are public project settings; **do not use the service role secret here**.
5. Sign up as the initial site owner, confirm the email, and obtain that user ID from Authentication > Users. Edit `supabase/promote-first-admin.sql` replacing the placeholder UUID, then execute it. **Do not run the file with the placeholder value.**
6. Configure CAPTCHA/bot protection for Supabase Auth, email verification, password reset, and reasonable Auth rate limits before enabling unrestricted public signup.

### Configuring Netlify

1. Push this project to your own Git repository (not performed in this deliverable), and connect the repo to Netlify. The repository must NOT contain a real `.env` file.
2. Netlify build command: `npm run build`; publish directory: `dist`; functions directory: `netlify/functions`. `netlify.toml` contains these settings and the `/api/moderation` rewrite.
3. Add to Netlify environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-only secret). Do not set VITE_ prefix on the service role secret. Rebuild after changing frontend environment variables.
4. Enable Netlify Forms for the site and confirm the `contact` form is detected. Test it by deploying and submitting a real message.
5. Verify signup/login, email confirmations, upload to private bucket, moderator view, successful publication and download, rejected submission, content reporting, access control and password reset in the deployed environment.
6. Replace sample brand placeholders, establish production URL, add `sitemap.xml`, OG image and verified legal information, configure contact notifications, and review consent and compliance requirements before public launch.

**Contact form**: In local dev it displays a message rather than claiming a submission was sent. On deployed Netlify it POSTs the actual data and reports HTTP result. A successful HTTP response does not guarantee email delivery; configure Netlify notifications separately.

### Security boundaries

- The browser gets only the public Supabase project URL and publishable/anon key. RLS protects client-side access.
- Anonymous visitors read only approved `wallpapers` metadata. Private submissions are stored in a non-public bucket and can only be viewed by their owner (or via admin-only server-signed preview links).
- User uploads never go directly to the public bucket. Netlify `moderation` uses a server-only key, explicitly checks the bearer session and owner-admin table, validates image bytes, and copies approved files across buckets. Admin rights cannot be granted from browser-supplied profile fields.
- Supabase Storage enforces bucket mime/size limits, and DB constraints enforce dimensions and status. This is not a complete malware scanning system; image decoding/sanitization or moderation tooling is advisable before growth.
- The upload rights checkbox is a declaration, NOT proof of ownership. The administrator must still verify licensing, and respond appropriately to infringement reports. A takedown process and final terms are launch prerequisites.
- Not all visual media content can be judged programmatically. Moderation must include human review before publication.
- Moderation is not transactional across Supabase Storage and Postgres; errors attempt to roll back partial work, but operational logging/recovery should be reviewed for scale.

### Pre-launch legal and privacy work

This build does NOT fabricate a privacy policy, license agreement, contributor content rules or legal compliance. Before real accounts and UGC go live, create appropriate privacy/terms pages, copyright submission and takedown policies, age-appropriate registration requirements, retention and deletion workflows, and a contact address. Make sure the policies match your actual operations and jurisdiction.

## Commands

```bash
npm run dev      # Vite development, local reference image visible
npm run build    # production Vite bundle (no user reference image)
npm run preview  # preview production bundle
npm test         # basic byte-signature unit tests
```

## File structure

`index.html` UI structure; `src/styles/` design system; `src/components/` interaction layers; `src/services/` auth, images and data services; `src/utils/` upload signature checks; `public/assets/images/` original sample art; `netlify/functions/moderation.js` protected admin API; `supabase/migrations/` schema and RLS; `reference/` PRIVATE LOCAL DESIGN REFERENCE.

## Known limitations, to verify before launch

- No Supabase project credentials or Netlify site were supplied, so live account, database, file storage, email, Forms and admin workflows could not be executed end-to-end in this environment.
- Public gallery currently displays authored sample wallpapers until at least one approved member upload exists, whereupon it displays published uploads. Expand content seeding/pagination for large collections.
- The `file` type restriction and 12MB limits are not a substitute for robust image scanning; stronger server-side processing and anti-spam protections are advised for a larger public site.
- Explicitly verify required policy wording and image redistribution rights before launch. This project is functional scaffolding, not a claim of production certification.
