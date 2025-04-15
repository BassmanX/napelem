import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// A titkos kulcs a JWT token dekódolásához (ha NextAuth.js-t használsz)
const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Azok az útvonalak, amelyekhez nem szükséges bejelentkezés
  const publicRoutes = ['/pages/login'];

  // Csak a védett útvonalakat ellenőrizzük
  if (!publicRoutes.includes(pathname)) {
    // Ellenőrizd, hogy a felhasználó be van-e jelentkezve
    const token = await getToken({ req: request, secret }); // Ha NextAuth.js-t használsz

    if (!token) {
      // Ha nincs token, irányítsd át a login oldalra
      const loginUrl = new URL('/pages/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname); // Esetleges visszatérési URL
      return NextResponse.redirect(loginUrl);
    }

    // Ha van token, a felhasználó be van jelentkezve, engedélyezd a hozzáférést
    alert("Hello, world!");
    return NextResponse.next();
  }

  // Ha az útvonal nyilvános, engedélyezd a hozzáférést
  alert("Hello, world!1");
  return NextResponse.next();
}

// Konfiguráció: mely útvonalakra fusson le a middleware
export const config = {
  matcher: ['/', '/pages/inventory', '/pages/technicians'], // Azok az útvonalak, amiket védeni szeretnél
};