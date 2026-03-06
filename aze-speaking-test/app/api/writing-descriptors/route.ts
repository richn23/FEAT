import { NextResponse } from "next/server";
import { WRITING_TASK1 } from "../../writing/writing-descriptors";

export async function GET() {
  return NextResponse.json(WRITING_TASK1);
}