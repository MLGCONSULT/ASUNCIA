import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const routesPubliques = ["/", "/connexion", "/inscription", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const estRoutePublique = routesPubliques.some((r) => pathname === r || pathname.startsWith("/auth/"));

  if (!estRoutePublique && pathname.startsWith("/app") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", pathname);
    response = NextResponse.redirect(url);
  }

  return response;
}
