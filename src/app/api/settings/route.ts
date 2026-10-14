import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const SETTINGS_PATH = join(process.cwd(), ".settings.json");

interface AppSettings {
  emailFrom?: string;
  sendingDomain?: string;
  companyName?: string;
}

async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveSettings(settings: AppSettings) {
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function GET() {
  try {
    await requireUser(["ADMIN"]);
    const settings = await loadSettings();
    return NextResponse.json({ settings });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser(["ADMIN"]);
    const body = await request.json();
    const current = await loadSettings();

    const updated: AppSettings = {
      ...current,
      ...(body.emailFrom !== undefined && { emailFrom: body.emailFrom }),
      ...(body.sendingDomain !== undefined && { sendingDomain: body.sendingDomain }),
      ...(body.companyName !== undefined && { companyName: body.companyName }),
    };

    await saveSettings(updated);
    return NextResponse.json({ settings: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
