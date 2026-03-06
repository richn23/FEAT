import { NextResponse } from "next/server";
import { WRITING_TASK3 } from "../../writing/writing-task3-descriptors";

export async function GET() {
  return NextResponse.json(WRITING_TASK3);
}
