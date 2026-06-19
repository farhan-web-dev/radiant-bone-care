import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const referenceId = session.client_reference_id;
  if (!referenceId) {
    throw new Error("checkout.session.completed missing client_reference_id");
  }

  const stripeReference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.id;

  const amount =
    session.amount_total != null ? session.amount_total / 100 : null;

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
  const { data, error } = await supabase.rpc("process_stripe_payment", {
    p_reference_id: referenceId,
    p_stripe_reference: stripeReference,
    p_amount: amount,
    p_event_id: eventId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables for stripe-webhook");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-11-20.acacia",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return jsonResponse({ error: message }, 400);
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, event.id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Stripe webhook handler error:", message);
    return jsonResponse({ error: message }, 500);
  }

  return jsonResponse({ received: true });
});
