import { existsSync } from "node:fs";
import { createInternalAccessParams } from "@/lib/server/internal-access";
import { getAppUrl } from "@/lib/server/transbank/config";
import { getOrderCategoryMeta, type OrderCategory } from "@/lib/order-categories";

type RequestType = "checkup" | "chronic_control" | "symptoms";
type OrderPdfCategory = OrderCategory;

type RenderOrderPdfFromPageInput = {
  requestType: RequestType;
  requestId: string;
  category: OrderPdfCategory;
};

async function resolveExecutablePath(chromium: { executablePath: () => Promise<string> }) {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }

  const chromiumPath = await chromium.executablePath();
  if (chromiumPath) {
    return chromiumPath;
  }

  const localCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ];

  const found = localCandidates.find((candidate) => existsSync(candidate));
  if (found) {
    return found;
  }

  throw new Error("No encontramos un ejecutable Chromium/Chrome para renderizar PDF.");
}

function buildOrderPageUrl(input: RenderOrderPdfFromPageInput) {
  const appUrl = getAppUrl();
  const params = new URLSearchParams({
    id: input.requestId,
  });

  if (input.requestType !== "symptoms") {
    const internal = createInternalAccessParams({
      requestType: input.requestType,
      requestId: input.requestId,
    });
    params.set("internalTs", internal.internalTs);
    params.set("internalSig", internal.internalSig);
  }

  if (input.requestType === "checkup") {
    params.set("printCategory", input.category);
    return `${appUrl}/chequeo/orden?${params.toString()}`;
  }

  if (input.requestType === "symptoms") {
    params.set("printCategory", input.category);
    return `${appUrl}/sintomas/orden?${params.toString()}`;
  }

  params.set("printCategory", input.category);
  return `${appUrl}/control-cronico/orden?${params.toString()}`;
}

function expectedPrintTitle(input: RenderOrderPdfFromPageInput) {
  return getOrderCategoryMeta(input.category).printTitle;
}

export async function renderOrderPdfFromOrderPage(input: RenderOrderPdfFromPageInput) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const executablePath = await resolveExecutablePath(chromium);
  const url = buildOrderPageUrl(input);
  const expectedTitle = expectedPrintTitle(input);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.emulateMediaType("print");

    await page.waitForSelector(".veramed-print-shell .veramed-order-page", { timeout: 45000 });
    await page.waitForFunction(
      (title: string) => {
        const el = document.querySelector(".veramed-order-page h2");
        return Boolean(el?.textContent?.includes(title));
      },
      { timeout: 15000 },
      expectedTitle,
    );
    await page.evaluate(async () => {
      if ("fonts" in document && document.fonts?.ready) {
        await document.fonts.ready;
      }
    });
    await page.waitForFunction(
      () => {
        const requiredImages = Array.from(
          document.querySelectorAll<HTMLImageElement>(
            "img.veramed-print-logo, img.veramed-print-signature",
          ),
        );
        return (
          requiredImages.length > 0 &&
          requiredImages.every((img) => img.complete && img.naturalWidth > 0)
        );
      },
      { timeout: 15000 },
    );

    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
