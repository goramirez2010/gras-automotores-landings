const BRANCHES = {
  "santa-fe": {
    name: "Santa Fe",
    zone: "Santa Fe Capital y zona",
    phoneDisplay: "342 405-9569",
    phoneE164: "5493424059569"
  },
  "rafaela": {
    name: "Rafaela",
    zone: "Rafaela y región",
    phoneDisplay: "3492 210-470",
    phoneE164: "5493492210470"
  },
  "san-justo": {
    name: "San Justo",
    zone: "San Justo y 50 km",
    phoneDisplay: "3498 405-233",
    phoneE164: "5493498405233"
  },
  "progreso": {
    name: "Progreso",
    zone: "Progreso, Esperanza y Las Colonias",
    phoneDisplay: "3497 404-083",
    phoneE164: "5493497404083"
  }
};

const TRACKING_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "gbraid", "wbraid"
];

window.dataLayer = window.dataLayer || [];

function newLeadId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `gras-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function captureTracking() {
  const query = new URLSearchParams(window.location.search);
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("gras_attribution") || "{}");
  } catch {
    localStorage.removeItem("gras_attribution");
  }
  TRACKING_KEYS.forEach((key) => {
    const value = query.get(key);
    if (value) saved[key] = value;
  });
  if (!saved.first_landing) saved.first_landing = window.location.href;
  saved.last_landing = window.location.href;
  saved.updated_at = new Date().toISOString();
  localStorage.setItem("gras_attribution", JSON.stringify(saved));
  return saved;
}

function getBranchSlug() {
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  return BRANCHES[slug] ? slug : null;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function buildWhatsAppUrl(branch, message) {
  return `https://wa.me/${branch.phoneE164}?text=${encodeURIComponent(message)}`;
}

const attribution = captureTracking();
const branchSlug = getBranchSlug();
const branch = branchSlug ? BRANCHES[branchSlug] : null;
const leadId = sessionStorage.getItem("gras_lead_id") || newLeadId();
sessionStorage.setItem("gras_lead_id", leadId);

function trackingContext(extra = {}) {
  return {
    branch_origin: branchSlug || "selector",
    landing_path: window.location.pathname,
    landing_url: window.location.href,
    page_referrer: document.referrer || "direct",
    lead_id: leadId,
    event_time: new Date().toISOString(),
    ...attribution,
    ...extra
  };
}

window.dataLayer.push({
  event: "page_view",
  ...trackingContext()
});

if (branch) {
  document.title = `Mes del Cambio en ${branch.name} | GRAS Automotores`;
  setText("headerBranch", `Sucursal ${branch.name}`);
  setText("eyebrowBranch", branch.name.toUpperCase());
  setText("bodyBranch", `GRAS ${branch.name}`);
  setText("contactBranch", `GRAS Automotores ${branch.name}`);
  setText("contactPhone", branch.phoneDisplay);
  document.querySelector(`[data-branch-link="${branchSlug}"]`)?.classList.add("active");

  const defaultMessage = `Hola, vi la campaña Mes del Cambio de GRAS ${branch.name} y quiero consultar por vehículos disponibles.`;
  document.querySelectorAll(".js-whatsapp").forEach((link) => {
    link.href = buildWhatsAppUrl(branch, defaultMessage);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.addEventListener("click", () => {
      window.dataLayer.push({
        event: "click_whatsapp",
        ...trackingContext({
        branch_destination: branchSlug,
        whatsapp_number: branch.phoneE164,
        conversion_type: "whatsapp"
        })
      });
    });
  });

  window.dataLayer.push({
    event: "view_branch",
    ...trackingContext({ branch_destination: branchSlug })
  });
} else {
  setText("headerBranch", "Elegí tu sucursal");
  document.querySelectorAll(".js-whatsapp").forEach((link) => {
    link.href = "#branchSelector";
  });
  document.getElementById("contacto")?.setAttribute("hidden", "");
  document.getElementById("floatingWhatsapp")?.setAttribute("hidden", "");
}

document.querySelectorAll("[data-branch-link]").forEach((link) => {
  link.addEventListener("click", () => {
    window.dataLayer.push({
      event: "branch_selected",
      ...trackingContext({ branch_selected: link.dataset.branchLink })
    });
  });
});

document.querySelectorAll(".js-interest").forEach((button) => {
  button.addEventListener("click", () => {
    const select = document.getElementById("leadInterest");
    if (select) {
      const match = [...select.options].find((option) => option.value.toLowerCase().includes(button.dataset.interest.toLowerCase().replace("0 km", "0 km")));
      if (match) select.value = match.value;
    }
    document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
    window.dataLayer.push({ event: "form_start", ...trackingContext({ selected_interest: button.dataset.interest }) });
  });
});

const form = document.getElementById("leadForm");
form?.addEventListener("focusin", () => {
  if (form.dataset.started) return;
  form.dataset.started = "true";
  window.dataLayer.push({ event: "form_start", ...trackingContext() });
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!branch) return;
  const name = document.getElementById("leadName").value.trim();
  const interest = document.getElementById("leadInterest").value;
  const detail = document.getElementById("leadDetail").value.trim();
  const message = [
    `Hola, soy ${name}. Vi la campaña Mes del Cambio de GRAS ${branch.name}.`,
    `Estoy buscando: ${interest}.`,
    detail ? `Detalle: ${detail}.` : "",
    "¿Me cuentan qué opciones tienen disponibles?"
  ].filter(Boolean).join("\n");

  window.dataLayer.push({
    event: "form_submit",
    ...trackingContext({ branch_destination: branchSlug, selected_interest: interest })
  });
  window.dataLayer.push({
    event: "generate_lead",
    ...trackingContext({
    branch_destination: branchSlug,
    whatsapp_number: branch.phoneE164,
    conversion_type: "form_to_whatsapp"
    })
  });
  window.dataLayer.push({
    event: "click_whatsapp",
    ...trackingContext({
      branch_destination: branchSlug,
      whatsapp_number: branch.phoneE164,
      conversion_type: "form_to_whatsapp"
    })
  });

  window.open(buildWhatsAppUrl(branch, message), "_blank", "noopener,noreferrer");
});
