# Graph Report - .  (2026-06-09)

## Corpus Check
- Corpus is ~26,197 words - fits in a single context window. You may not need a graph.

## Summary
- 390 nodes · 529 edges · 23 communities (13 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.81)
- Token cost: 0 input · 254,305 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Home Page & Localization|Home Page & Localization]]
- [[_COMMUNITY_Events Pages & Data Model|Events Pages & Data Model]]
- [[_COMMUNITY_Project Docs & Design System|Project Docs & Design System]]
- [[_COMMUNITY_Angular Build Configuration|Angular Build Configuration]]
- [[_COMMUNITY_Analytics & Signup Services|Analytics & Signup Services]]
- [[_COMMUNITY_SSR Bootstrap & Dev Tooling|SSR Bootstrap & Dev Tooling]]
- [[_COMMUNITY_Angular CLI & Dev Dependencies|Angular CLI & Dev Dependencies]]
- [[_COMMUNITY_Runtime Dependencies & Scripts|Runtime Dependencies & Scripts]]
- [[_COMMUNITY_Media Asset Pipeline|Media Asset Pipeline]]
- [[_COMMUNITY_App Bootstrap & Routing|App Bootstrap & Routing]]
- [[_COMMUNITY_Keynote Scrub-Stage Animation|Keynote Scrub-Stage Animation]]
- [[_COMMUNITY_Page Templates & Components|Page Templates & Components]]
- [[_COMMUNITY_Open Graph Social Card|Open Graph Social Card]]
- [[_COMMUNITY_VS Code Launch Config|VS Code Launch Config]]
- [[_COMMUNITY_VS Code Tasks Config|VS Code Tasks Config]]
- [[_COMMUNITY_VS Code Extensions & MCP|VS Code Extensions & MCP]]
- [[_COMMUNITY_Notify Form Template|Notify Form Template]]
- [[_COMMUNITY_App  PWA Icons|App / PWA Icons]]
- [[_COMMUNITY_Editor Recommendations|Editor Recommendations]]
- [[_COMMUNITY_Accessibility (WCAG AA)|Accessibility (WCAG AA)]]
- [[_COMMUNITY_Internationalization (DEEN)|Internationalization (DE/EN)]]
- [[_COMMUNITY_Express SSR Server|Express SSR Server]]

## God Nodes (most connected - your core abstractions)
1. `SeoService` - 14 edges
2. `ScrubStage` - 13 edges
3. `options` - 10 edges
4. `SalutEvent` - 9 edges
5. `scripts` - 8 edges
6. `eventTheme` - 8 edges
7. `Locale` - 8 edges
8. `build target (@angular/build:application)` - 8 edges
9. `salut-landing` - 7 edges
10. `development` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Umami analytics (cookieless, self-hosted)` --semantically_similar_to--> `Self-hosted fonts (@fontsource Space Grotesk, DSGVO)`  [INFERRED] [semantically similar]
  todo.md → README.md
- `build target (@angular/build:application)` --implements--> `Angular SSR (server-side rendering)`  [INFERRED]
  angular.json → package.json
- `Onboarding/waitlist conversion funnel` --conceptually_related_to--> `SubscribeService (POST /api/subscribe client)`  [INFERRED]
  scope.md → README.md
- `docker-compose landing service (Coolify reference)` --conceptually_related_to--> `Express SSR server (src/server.ts)`  [INFERRED]
  docker-compose.yml → README.md
- `Waitlist endpoint contract (frozen)` --references--> `Express SSR server (src/server.ts)`  [EXTRACTED]
  instructions.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Waitlist sign-up flow (form → server → API → Postgres)** — readme_subscribe_service, readme_server_ts, readme_salut_api, scope_waitlist_funnel [EXTRACTED 0.90]
- **DSGVO-clean construction (self-hosted fonts, no trackers, no IP)** — readme_self_hosted_fonts, continue_dsgvo_posture, scope_legal_pages, todo_analytics_umami [INFERRED 0.85]
- **SEO-first SSR/prerender rendering pattern** — readme_angular_ssr, readme_seo_service, instructions_seo_rules, robots_txt [EXTRACTED 0.85]
- **Angular build/serve/test pipeline** — angular_build_target, angular_serve_target, angular_test_target [EXTRACTED 1.00]
- **TypeScript project references** — tsconfig_json, tsconfig_app_json, tsconfig_spec_json [EXTRACTED 1.00]
- **Build-time media asset generation** — scripts_extract_frames, scripts_gen_og, concept_seq_manifest, concept_og_image [INFERRED 0.75]
- **SSR bootstrap pipeline** — main_server_bootstrap, app_config_server_config, app_config_appconfig, app_routes_server_serverroutes, server_app [INFERRED 0.85]
- **Browser bootstrap pipeline** — main_bootstrap, app_config_appconfig, app_routes_routes, app_app [INFERRED 0.85]
- **SEO + locale metadata flow** — seo_seo_service, i18n_locale, app_routes_routes [INFERRED 0.75]
- **Events Data Flow (resolver to service to model/config/taxonomy)** — events_events_resolver, events_events_service, events_event_model, events_events_config, events_events_taxonomy [INFERRED 0.85]
- **Same-origin Express backend signup proxies** — api_preregister_service, api_subscribe_service [INFERRED 0.75]
- **Keynote immersive scroll experience** — keynote_scrub_stage_component, keynote_drink_glass_component, keynote_click_pop_directive, home_home [INFERRED 0.85]
- **Home landing page hero + acts + footer structure** — home_home_html, home_home_ts, events_events_ts, legal_impressum_ts, legal_datenschutz_ts [EXTRACTED 0.85]
- **Events listing to detail navigation funnel** — events_events_html, events_events_ts, event_detail_event_detail_html, event_detail_event_detail_ts [EXTRACTED 0.85]

## Communities (23 total, 10 thin omitted)

### Community 0 - "Home Page & Localization"
Cohesion: 0.06
Nodes (28): PreRegisterPayload, PreregisterService, Cocktail, DE, EN, FaqItem, HOME_COPY, HomeCopy (+20 more)

### Community 1 - "Events Pages & Data Model"
Cohesion: 0.07
Nodes (35): absUrl(), buildGallery(), EventDetail, eventSchema(), FULL_FMT, metaDesc(), priceValue(), TIME_FMT (+27 more)

### Community 2 - "Project Docs & Design System"
Cohesion: 0.06
Nodes (43): Domain cutover (staging → production), DSGVO no-third-party-request posture, Continue / resume-here handoff, docker-compose landing service (Coolify reference), Native CSS scroll-driven animations, Image-sequence scrubbing (not <video>), Keynote immersive scroll landing, salut-scrub-stage (GSAP ScrollTrigger frame scrub) (+35 more)

### Community 3 - "Angular Build Configuration"
Cohesion: 0.07
Nodes (32): build, serve, test, builder, configurations, defaultConfiguration, options, development (+24 more)

### Community 4 - "Analytics & Signup Services"
Cohesion: 0.09
Nodes (20): UMAMI, umamiEnabled(), umamiOrigin(), umamiScriptUrl(), AnalyticsService, UmamiTracker, SubscribeResponse, SubscribeService (+12 more)

### Community 5 - "SSR Bootstrap & Dev Tooling"
Cohesion: 0.08
Nodes (27): build target (@angular/build:application), serve target (@angular/build:dev-server), test target (@angular/build:unit-test), Angular SSR (server-side rendering), Express SSR server, GSAP animation library, src/main.server.ts (server entry), src/main.ts (browser entry) (+19 more)

### Community 6 - "Angular CLI & Dev Dependencies"
Cohesion: 0.07
Nodes (28): cli, analytics, packageManager, newProjectRoot, projects, salut-landing, prefix, projectType (+20 more)

### Community 7 - "Runtime Dependencies & Scripts"
Cohesion: 0.07
Nodes (26): dependencies, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-server, @angular/router (+18 more)

### Community 8 - "Media Asset Pipeline"
Cohesion: 0.12
Nodes (21): ffmpeg/ffprobe frame extraction, og-image social card (svg->png), salut-scrub-stage image sequence scrubbing, seq manifest.json (frames/poster), sharp image rasterizer, npm frames (extract-frames), DEFAULTS, durationSeconds() (+13 more)

### Community 9 - "App Bootstrap & Routing"
Cohesion: 0.14
Nodes (13): App, appConfig, config, serverConfig, routes, serverRoutes, Browser appConfig, Server ApplicationConfig (config) (+5 more)

### Community 11 - "Page Templates & Components"
Cohesion: 0.27
Nodes (13): app.html (root router shell), App root component, event-detail.html template, EventDetail page component, events.html (events listing template), Events page component, home.html (landing page template), Home page component (+5 more)

### Community 12 - "Open Graph Social Card"
Cohesion: 1.00
Nodes (4): Salut Brand Wordmark, Salut Open Graph Card (PNG), Salut Open Graph Card (SVG source), Tagline: Nightlife · Drinks · Friends / Track the night — and your limit — together.

## Knowledge Gaps
- **147 isolated node(s):** `name`, `image`, `forwardPorts`, `postCreateCommand`, `extensions` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `NotifyForm` connect `Analytics & Signup Services` to `Home Page & Localization`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `SeoService` connect `Home Page & Localization` to `Events Pages & Data Model`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Angular CLI & Dev Dependencies` to `Runtime Dependencies & Scripts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `name`, `image`, `forwardPorts` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Home Page & Localization` be split into smaller, more focused modules?**
  _Cohesion score 0.06313497822931785 - nodes in this community are weakly interconnected._
- **Should `Events Pages & Data Model` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._
- **Should `Project Docs & Design System` be split into smaller, more focused modules?**
  _Cohesion score 0.05647840531561462 - nodes in this community are weakly interconnected._