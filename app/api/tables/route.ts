import { GET as hostTablesGET, PATCH as hostTablesPATCH, POST as hostTablesPOST, DELETE as hostTablesDELETE } from '@/app/api/host/tables/route';

export async function GET(request: Request) {
  return hostTablesGET(request);
}

export async function PATCH(request: Request) {
  return hostTablesPATCH(request);
}

export async function POST(request: Request) {
  return hostTablesPOST(request);
}

export async function DELETE(request: Request) {
  return hostTablesDELETE(request);
}
