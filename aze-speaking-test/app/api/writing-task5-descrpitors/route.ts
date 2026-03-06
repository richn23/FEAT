import { NextResponse } from "next/server";
import { WRITING_TASK5 } from "../../writing/writing-task5-descriptors";

export async function GET() {
  return NextResponse.json(WRITING_TASK5);
}
