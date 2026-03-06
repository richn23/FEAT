import { NextResponse } from "next/server";
import { TASK1 } from "../../descriptors";

export async function GET() {
  return NextResponse.json(TASK1);
}
