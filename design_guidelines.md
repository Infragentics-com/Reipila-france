{
  "product": {
    "name": "PropSignal v2",
    "type": "real-estate intelligence operating system (map-first)",
    "audience": "Professional real-estate operators/analysts in Métropole de Lyon (power users; speed + density + transparency)",
    "brand_attributes": [
      "light-premium (Apple-level clarity)",
      "institutional + financial precision",
      "high information density (Bloomberg-like) without dark UI",
      "disciplined interaction patterns (Linear/Figma contextual panels)",
      "transparent AI reasoning (auditability)"
    ]
  },

  "design_personality": {
    "keywords": [
      "calm background",
      "crisp surfaces",
      "hairline borders",
      "structured blocks (not cards)",
      "contextual drawers",
      "log-based reasoning",
      "map as primary canvas"
    ],
    "anti_patterns_to_avoid": [
      "traditional SaaS KPI card grids",
      "widget soup",
      "CRM-like lead/deal language",
      "heavy borders",
      "dark SaaS default",
      "chart-heavy dashboards (prefer sparklines/heatmaps/ranking stacks)",
      "centered page layouts"
    ]
  },

  "typography": {
    "font_pairing": {
      "ui": {
        "family": "Space Grotesk",
        "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        "usage": "All UI labels, headings, navigation, buttons"
      },
      "body": {
        "family": "Inter",
        "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        "usage": "Paragraphs, descriptions, feed summaries"
      },
      "mono": {
        "family": "JetBrains Mono",
        "fallback": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New",
        "usage": "Signal Convergence Log, IDs (parcel), timestamps, technical metadata"
      }
    },
    "google_fonts_import": {
      "note": "Add to /app/frontend/public/index.html <head> (or equivalent) — project uses .js files.",
      "href": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
    },
    "text_size_hierarchy": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm md:text-base",
      "small": "text-xs"
    },
    "type_rules": [
      "Use tabular numbers for conviction %, surfaces, prices: add Tailwind 'tabular-nums'.",
      "Use mono only for logs/IDs; keep the rest sans for readability.",
      "Prefer sentence case labels; avoid ALL CAPS except severity tags.",
      "Line-height: dense but breathable: headings 'leading-tight', body 'leading-6'."
    ]
  },

  "color_system": {
    "palette_locked_by_user": {
      "background": "#F5F5F7",
      "surface": "#FFFFFF",
      "borders": "#E5E7EB",
      "text": "#111827",
      "primary": "#6366F1",
      "success": "#16A34A",
      "warning": "#F59E0B",
      "critical": "#EF4444"
    },
    "semantic_extensions": {
      "text_muted": "#6B7280",
      "text_subtle": "#9CA3AF",
      "surface_2": "#FAFAFB",
      "surface_3": "#F3F4F6",
      "ring": "#6366F1",
      "focus_shadow": "0 0 0 3px rgba(99, 102, 241, 0.22)",
      "shadow_soft": "0 1px 2px rgba(17,24,39,0.06), 0 8px 24px rgba(17,24,39,0.06)",
      "shadow_panel": "0 1px 1px rgba(17,24,39,0.05), 0 12px 32px rgba(17,24,39,0.08)"
    },
    "map_overlays": {
      "heatmap_stops": {
        "low": "rgba(99,102,241,0.10)",
        "mid": "rgba(245,158,11,0.18)",
        "high": "rgba(239,68,68,0.22)",
        "very_high": "rgba(239,68,68,0.34)"
      },
      "parcel_outline": "rgba(17,24,39,0.18)",
      "parcel_outline_hover": "rgba(99,102,241,0.65)",
      "parcel_outline_selected": "rgba(99,102,241,0.95)",
      "marker_new_pulse": "rgba(99,102,241,0.35)"
    },
    "gradients": {
      "allowed_usage": [
        "Hero/header background only (<=20% viewport)",
        "Decorative overlays (noise + subtle tint)",
        "Map legend ramp preview (tiny, non-text)"
      ],
      "approved_mild_gradient_examples": [
        "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(245,245,247,0.0) 60%)",
        "radial-gradient(600px circle at 20% 0%, rgba(99,102,241,0.10), transparent 55%)"
      ]
    }
  },

  "design_tokens_css": {
    "where": "/app/frontend/src/index.css (override :root tokens to match locked palette)",
    "tokens": {
      "--ps-bg": "#F5F5F7",
      "--ps-surface": "#FFFFFF",
      "--ps-border": "#E5E7EB",
      "--ps-text": "#111827",
      "--ps-primary": "#6366F1",
      "--ps-success": "#16A34A",
      "--ps-warning": "#F59E0B",
      "--ps-critical": "#EF4444",
      "--ps-muted": "#6B7280",
      "--ps-radius-sm": "10px",
      "--ps-radius-md": "14px",
      "--ps-radius-lg": "18px",
      "--ps-shadow-soft": "0 1px 2px rgba(17,24,39,0.06), 0 8px 24px rgba(17,24,39,0.06)",
      "--ps-shadow-panel": "0 1px 1px rgba(17,24,39,0.05), 0 12px 32px rgba(17,24,39,0.08)",
      "--ps-focus": "0 0 0 3px rgba(99, 102, 241, 0.22)"
    },
    "shadcn_mapping": {
      "note": "Shadcn uses HSL tokens; you can either convert to HSL or keep existing and add ps-* tokens for custom classes. Prefer adding ps-* tokens + Tailwind arbitrary values for exact hex compliance.",
      "recommended": {
        "body_bg": "bg-[var(--ps-bg)]",
        "surface": "bg-[var(--ps-surface)]",
        "border": "border-[var(--ps-border)]",
        "text": "text-[var(--ps-text)]",
        "primary": "bg-[#6366F1] text-white",
        "ring": "focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F7]"
      }
    }
  },

  "layout": {
    "global_shell": {
      "topbar_height": "h-14 md:h-16",
      "sidebar_width": "w-[76px] (icon+label) md:w-[88px]",
      "left_panel_width": "w-[360px] lg:w-[420px]",
      "center_map_width": "flex-1 (target 55–65% on desktop)",
      "right_drawer_width": "w-[380px] xl:w-[420px]",
      "gutter": "gap-3 md:gap-4",
      "page_padding": "p-3 md:p-4",
      "grid_rule": "Use CSS grid for the 3-column body: [sidebar][left panel][map][drawer]. Drawer collapses on <lg into Sheet/Drawer overlay."
    },
    "responsive_behavior": {
      "mobile": [
        "Topbar stays fixed.",
        "Sidebar becomes bottom nav (optional) OR collapses into Sheet triggered by hamburger.",
        "Left panel becomes a Drawer (bottom sheet) with snap points: 35% / 70%.",
        "Right intelligence drawer becomes full-screen Sheet with tabs at top."
      ],
      "tablet": [
        "Keep sidebar + map.",
        "Left panel collapsible via Resizable handle.",
        "Right drawer overlays map when opened."
      ],
      "desktop": [
        "Full 3-column with persistent left panel and right drawer.",
        "Use Resizable from shadcn for left panel width adjustments."
      ]
    }
  },

  "component_specs": {
    "component_path": {
      "topbar": ["/app/frontend/src/components/ui/input.jsx", "/app/frontend/src/components/ui/avatar.jsx", "/app/frontend/src/components/ui/badge.jsx", "/app/frontend/src/components/ui/button.jsx", "/app/frontend/src/components/ui/tooltip.jsx"],
      "sidebar": ["/app/frontend/src/components/ui/tooltip.jsx", "/app/frontend/src/components/ui/button.jsx", "/app/frontend/src/components/ui/separator.jsx"],
      "left_panel": ["/app/frontend/src/components/ui/scroll-area.jsx", "/app/frontend/src/components/ui/tabs.jsx", "/app/frontend/src/components/ui/badge.jsx", "/app/frontend/src/components/ui/skeleton.jsx"],
      "stat_tile": ["/app/frontend/src/components/ui/card.jsx"],
      "intelligence_block": ["/app/frontend/src/components/ui/hover-card.jsx", "/app/frontend/src/components/ui/badge.jsx", "/app/frontend/src/components/ui/separator.jsx"],
      "filter_pills": ["/app/frontend/src/components/ui/toggle-group.jsx", "/app/frontend/src/components/ui/popover.jsx", "/app/frontend/src/components/ui/command.jsx"],
      "map_controls": ["/app/frontend/src/components/ui/button.jsx", "/app/frontend/src/components/ui/dropdown-menu.jsx", "/app/frontend/src/components/ui/tooltip.jsx"],
      "right_drawer": ["/app/frontend/src/components/ui/drawer.jsx", "/app/frontend/src/components/ui/sheet.jsx", "/app/frontend/src/components/ui/tabs.jsx", "/app/frontend/src/components/ui/separator.jsx"],
      "convergence_log": ["/app/frontend/src/components/ui/scroll-area.jsx", "/app/frontend/src/components/ui/badge.jsx"],
      "pipeline_board": ["/app/frontend/src/components/ui/resizable.jsx", "/app/frontend/src/components/ui/card.jsx", "/app/frontend/src/components/ui/badge.jsx", "/app/frontend/src/components/ui/textarea.jsx"],
      "toasts": ["/app/frontend/src/components/ui/sonner.jsx"]
    },

    "top_bar": {
      "layout": "Left: logo wordmark; Center: large search; Right: notifications + Market Pulse pill + avatar",
      "search": {
        "placeholder": "Search address, parcel, owner, or area…",
        "classes": "h-10 md:h-11 w-full max-w-[720px] rounded-[12px] bg-white border border-[#E5E7EB] px-3 md:px-4 text-sm md:text-base shadow-[0_1px_0_rgba(17,24,39,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]",
        "microcopy": "Support fuzzy search + recent searches (Command component).",
        "data_testid": "topbar-global-search-input"
      },
      "market_pulse_pill": {
        "text": "Market Pulse • Live",
        "classes": "inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[#111827] shadow-sm",
        "live_dot": "w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse",
        "data_testid": "topbar-market-pulse-pill"
      },
      "notifications": {
        "pattern": "Bell icon button with Badge count",
        "data_testid": "topbar-notifications-button"
      }
    },

    "left_sidebar": {
      "pattern": "Narrow vertical rail with icon + label; active item uses indigo left indicator",
      "nav_items": ["Home", "Signals", "Opportunities", "Map", "Pipeline", "Market"],
      "classes": "bg-[#FFFFFF] border-r border-[#E5E7EB]",
      "item_classes": {
        "base": "group w-full flex flex-col items-center gap-1 rounded-[12px] px-2 py-2 text-[11px] font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]",
        "active": "text-[#111827] bg-[#F3F4F6] relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[#6366F1]"
      },
      "data_testid_prefix": "sidebar-nav-"
    },

    "stat_tile": {
      "use_case": "3 small tiles at top of left panel",
      "layout": "Label + value + delta vs yesterday",
      "classes": "rounded-[14px] bg-white border border-[#E5E7EB] px-3 py-2 shadow-[0_1px_0_rgba(17,24,39,0.04)]",
      "label": "text-[11px] font-medium text-[#6B7280]",
      "value": "text-lg font-semibold text-[#111827] tabular-nums",
      "delta": "text-[11px] font-medium text-[#16A34A]",
      "data_testid": "market-overview-stat-tile"
    },

    "intelligence_block": {
      "purpose": "Replace cards with structured intelligence blocks in Live Market Feed",
      "anatomy": [
        "severity tag",
        "title",
        "location line",
        "chips",
        "conviction % (right aligned)",
        "timestamp"
      ],
      "container_classes": "rounded-[16px] bg-white border border-[#E5E7EB] px-3 py-3 hover:shadow-[0_1px_2px_rgba(17,24,39,0.06),0_10px_24px_rgba(17,24,39,0.08)] transition-shadow",
      "row_classes": "flex items-start justify-between gap-3",
      "title_classes": "text-sm font-semibold text-[#111827] leading-tight",
      "meta_classes": "text-xs text-[#6B7280]",
      "chips": {
        "classes": "inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#FAFAFB] px-2 py-0.5 text-[11px] text-[#111827]",
        "max": 3,
        "overflow": "If >3, show '+N' chip opening Popover with full list."
      },
      "conviction": {
        "classes": "text-lg font-semibold tabular-nums text-[#111827]",
        "sub": "text-[11px] text-[#6B7280]"
      },
      "data_testid": "live-feed-intelligence-block"
    },

    "severity_tag": {
      "variants": {
        "high_conviction": {"label": "HIGH CONVICTION", "bg": "rgba(239,68,68,0.10)", "text": "#EF4444", "border": "rgba(239,68,68,0.22)"},
        "convergence_event": {"label": "CONVERGENCE EVENT", "bg": "rgba(99,102,241,0.10)", "text": "#6366F1", "border": "rgba(99,102,241,0.22)"},
        "new_signal": {"label": "NEW SIGNAL", "bg": "rgba(22,163,74,0.10)", "text": "#16A34A", "border": "rgba(22,163,74,0.22)"},
        "market_anomaly": {"label": "MARKET ANOMALY", "bg": "rgba(245,158,11,0.12)", "text": "#B45309", "border": "rgba(245,158,11,0.26)"}
      },
      "classes": "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
    },

    "map_canvas": {
      "library": "MapLibre GL",
      "container_classes": "relative h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] rounded-[18px] overflow-hidden bg-white border border-[#E5E7EB] shadow-[0_1px_0_rgba(17,24,39,0.04)]",
      "top_controls": {
        "filter_pills": {
          "pattern": "ToggleGroup + Popover/Command for dropdown filters",
          "classes": "absolute left-3 top-3 z-20 flex flex-wrap gap-2",
          "pill_classes": "h-9 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#111827] shadow-sm hover:bg-[#F3F4F6] transition-colors",
          "active": "data-[state=on]:bg-[#111827] data-[state=on]:text-white data-[state=on]:border-[#111827]",
          "data_testid_prefix": "map-filter-pill-"
        },
        "legend": {
          "classes": "absolute left-3 bottom-3 z-20 rounded-[14px] border border-[#E5E7EB] bg-white/90 backdrop-blur px-3 py-2 shadow-sm",
          "content": "Title + ramp + labels Low → Very High",
          "ramp": "h-2 w-[160px] rounded-full bg-[linear-gradient(90deg,rgba(99,102,241,0.55),rgba(245,158,11,0.55),rgba(239,68,68,0.65))]",
          "data_testid": "map-heatmap-legend"
        },
        "map_controls": {
          "classes": "absolute right-3 top-3 z-20 flex flex-col gap-2",
          "buttons": "h-9 w-9 rounded-[12px] border border-[#E5E7EB] bg-white shadow-sm hover:bg-[#F3F4F6] transition-colors",
          "data_testid_prefix": "map-control-"
        }
      },
      "interactions": [
        "Hover parcel: show thin indigo outline + small tooltip (HoverCard) with parcel id + commune + conviction.",
        "Click parcel: lock highlight + open right intelligence drawer.",
        "New signal markers: subtle pulse ring for 6s then settle.",
        "Cluster markers: numbered circles with tabular-nums; expand on click with smooth zoom.",
        "Performance: use vector tiles + feature-state for hover/selected styling."
      ]
    },

    "right_intelligence_drawer": {
      "pattern": "Persistent panel on desktop; Sheet overlay on mobile/tablet",
      "header": {
        "photo": "Use AspectRatio with a neutral building photo; if none, use gradient placeholder + parcel id.",
        "close": "Icon button top-right",
        "data_testid": "intelligence-drawer-close-button"
      },
      "title_block": {
        "severity_tag": "Use severity_tag variants",
        "conviction": "text-3xl font-semibold tabular-nums",
        "title": "text-base font-semibold",
        "address": "text-xs text-[#6B7280]"
      },
      "meta_row": {
        "layout": "4 compact meta chips: Type / Surface / Owner / Built",
        "classes": "grid grid-cols-2 gap-2",
        "chip": "rounded-[12px] border border-[#E5E7EB] bg-[#FAFAFB] px-2 py-2"
      },
      "tabs": ["Overview", "Signals", "Analysis", "Comparables", "Notes"],
      "raw_signal_inputs": {
        "pattern": "Dense list with colored dots + label + value + weight",
        "dot": "w-2 h-2 rounded-full",
        "row_classes": "flex items-center justify-between gap-3 py-2",
        "value_classes": "text-xs font-medium text-[#111827]",
        "weight_badge": "text-[10px] rounded-full border px-2 py-0.5",
        "data_testid": "drawer-raw-signal-inputs"
      },
      "signal_convergence_log": {
        "pattern": "Monospace step list with checkmarks; looks like an audit trail",
        "container_classes": "rounded-[14px] border border-[#E5E7EB] bg-[#FAFAFB] p-3",
        "line_classes": "font-mono text-[12px] leading-5 text-[#111827]",
        "step_badge": "inline-flex items-center rounded-full bg-white border border-[#E5E7EB] px-2 py-0.5 text-[10px] font-semibold",
        "data_testid": "drawer-signal-convergence-log"
      },
      "bottom_action_bar": {
        "classes": "sticky bottom-0 bg-white/90 backdrop-blur border-t border-[#E5E7EB] p-3 flex items-center gap-2",
        "primary": {
          "label": "Add to Pipeline",
          "classes": "h-10 rounded-[12px] bg-[#6366F1] px-4 text-sm font-semibold text-white shadow-sm hover:brightness-[0.98] transition-[filter] active:scale-[0.99]",
          "data_testid": "drawer-add-to-pipeline-button"
        },
        "secondary": {
          "label": "Create Memo",
          "classes": "h-10 rounded-[12px] border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6] transition-colors",
          "data_testid": "drawer-create-memo-button"
        },
        "overflow": {
          "label": "More",
          "data_testid": "drawer-overflow-menu-button"
        }
      }
    },

    "pipeline_execution_flow": {
      "pattern": "Kanban board but named Execution Flow; avoid CRM vibe by focusing on actions + memos + DD",
      "columns": ["Sourced", "Qualified", "Contact Strategy", "DD", "Offer", "Closed"],
      "column_classes": "rounded-[16px] border border-[#E5E7EB] bg-white",
      "item": {
        "classes": "rounded-[14px] border border-[#E5E7EB] bg-[#FAFAFB] p-3 hover:bg-white transition-colors",
        "content": "Parcel + conviction + next action + last touch",
        "data_testid": "execution-flow-item"
      }
    }
  },

  "motion_microinteractions": {
    "libraries": {
      "framer_motion": {
        "use_for": ["drawer slide-in", "feed item entrance", "marker pulse overlay (UI layer)", "skeleton shimmer timing"],
        "install": "npm i framer-motion"
      }
    },
    "principles": [
      "Use short, crisp transitions: 120–180ms for hover; 220–320ms for drawers.",
      "Avoid transition: all. Use transition-colors, transition-shadow, transition-[filter].",
      "Prefer subtle elevation on hover (shadow) rather than scaling entire blocks.",
      "Respect prefers-reduced-motion: disable pulses and large slide animations."
    ],
    "recommended_easings": {
      "standard": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "entrance": "cubic-bezier(0.16, 1, 0.3, 1)"
    }
  },

  "data_density_patterns": {
    "rules": [
      "Use structured rows + separators instead of big cards.",
      "Keep metadata in muted text; keep conviction % prominent.",
      "Use ScrollArea for feed and logs; keep headers sticky.",
      "Use Resizable for left panel on desktop power users.",
      "Prefer sparklines (Recharts LineChart with minimal axes) over full charts."
    ],
    "recharts_sparkline": {
      "install": "npm i recharts",
      "spec": "Height 28–36px, stroke #6366F1, no grid, no axes, tooltip on hover only.",
      "data_testid": "market-sparkline"
    }
  },

  "states": {
    "loading": {
      "pattern": "Skeleton blocks matching final layout (no spinners as primary)",
      "use": ["left feed list", "drawer header", "map overlay legend"],
      "component": "/app/frontend/src/components/ui/skeleton.jsx",
      "data_testid": "loading-skeleton"
    },
    "empty": {
      "feed": {
        "message": "No new signals in the last 24h. Expand filters or widen area.",
        "cta": "Reset filters",
        "data_testid": "empty-live-feed"
      },
      "drawer": {
        "message": "Select a parcel or signal marker to inspect reasoning.",
        "data_testid": "empty-intelligence-drawer"
      }
    },
    "error": {
      "pattern": "Inline Alert with retry; keep map usable",
      "component": "/app/frontend/src/components/ui/alert.jsx",
      "data_testid": "error-inline-alert"
    }
  },

  "accessibility": {
    "rules": [
      "All interactive elements must have visible focus ring (indigo) and keyboard access.",
      "Map interactions: provide keyboard-accessible list alternative for selected signals (left panel).",
      "Color is never the only indicator: severity tags include text labels.",
      "Minimum touch target: 40px for icon buttons on mobile.",
      "Use aria-label on icon-only buttons (bell, close, layers)."
    ]
  },

  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid (kebab-case).",
    "examples": [
      "data-testid=\"topbar-global-search-input\"",
      "data-testid=\"sidebar-nav-signals\"",
      "data-testid=\"live-feed-intelligence-block\"",
      "data-testid=\"map-heatmap-legend\"",
      "data-testid=\"drawer-add-to-pipeline-button\""
    ]
  },

  "image_urls": {
    "note": "Image provider tool unavailable in this environment. Use neutral, daylight Lyon building imagery; keep it subtle and non-distracting.",
    "categories": [
      {
        "category": "drawer_header_building_photo",
        "description": "Wide (16:9) neutral building facade photo for the intelligence drawer header.",
        "suggested_sources": [
          "https://unsplash.com/s/photos/lyon-building",
          "https://www.pexels.com/search/lyon%20building/"
        ]
      },
      {
        "category": "opportunity_thumbnail",
        "description": "Small square thumbnails (64–72px) for Top Opportunities list.",
        "suggested_sources": [
          "https://unsplash.com/s/photos/france-apartment-building",
          "https://www.pexels.com/search/apartment%20building%20france/"
        ]
      }
    ]
  },

  "additional_libraries": {
    "maplibre_gl": {
      "install": "npm i maplibre-gl",
      "css": "import 'maplibre-gl/dist/maplibre-gl.css' in the map component",
      "notes": [
        "Use feature-state for hover/selected parcel styling.",
        "Cluster markers via GeoJSON source clustering.",
        "Heatmap overlay via heatmap layer; keep opacity low for light UI."
      ]
    },
    "lucide_react": {
      "status": "already in stack per prompt",
      "usage": "Use for icons; avoid emoji icons."
    }
  },

  "instructions_to_main_agent": [
    "Update /app/frontend/src/App.css: remove default CRA centered/dark header styles; do not center the app container.",
    "Update /app/frontend/src/index.css tokens: set body background to #F5F5F7 and ensure text is #111827; keep borders #E5E7EB.",
    "Implement the 3-column shell exactly: Topbar + Sidebar + Left Feed Panel + Map + Right Drawer.",
    "Avoid dashboard KPI grids; use live feed blocks + contextual drawer + map overlays.",
    "Use shadcn ScrollArea for feed/logs; Tabs for drawer sections; Drawer/Sheet for responsive overlays.",
    "Every interactive element and key info must include data-testid in kebab-case.",
    "Keep gradients minimal and only as subtle decorative overlays (<=20% viewport)."
  ],

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "\n**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "\n**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**",
    "\n</Font Guidelines>",
    "\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "   ",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "   ",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "    Eg: - if it implies playful/energetic, choose a colorful scheme",
    "           - if it implies monochrome/minimal, choose a black–white/neutral scheme",
    "\n**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    "\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "\n**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "\n**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "\n**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
