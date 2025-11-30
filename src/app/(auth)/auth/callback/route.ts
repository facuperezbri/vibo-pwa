import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/";

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        errorDescription || "Error de autenticación"
      )}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (exchangeError) {
      console.error("Error exchanging code:", exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          exchangeError.message || "Error al iniciar sesión"
        )}`
      );
    }

    // Wait a bit for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if user needs to complete profile (OAuth signup)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          "Error al obtener información del usuario"
        )}`
      );
    }

    if (user) {
      // Try to get profile, create if it doesn't exist
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("category_label")
        .eq("id", user.id)
        .single();

      // If profile doesn't exist, try to create it
      if (profileError || !profile) {
        const metadata = user.user_metadata || {};
        const username =
          metadata.username ||
          metadata.preferred_username ||
          metadata.email?.split("@")[0] ||
          `user_${user.id.slice(0, 8)}`;
        const fullName =
          metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          username;

        const { error: createError } = await supabase.from("profiles").insert({
          id: user.id,
          username: username,
          full_name: fullName,
          avatar_url: metadata.avatar_url || null,
          elo_score: 1400,
          category_label: "8va",
        });

        if (createError) {
          console.error("Error creating profile:", createError);
          // Still redirect to complete-profile to let user fix it
        }

        // Redirect to complete profile since category is default
        return NextResponse.redirect(`${origin}/complete-profile`);
      }

      // If profile doesn't have category_label, redirect to complete profile
      if (!profile.category_label) {
        return NextResponse.redirect(`${origin}/complete-profile`);
      }
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Código de autenticación no encontrado"
    )}`
  );
}
