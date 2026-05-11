# Revify — call-2 prep brief

*Authored Day 53 chase #4 for Bryan's second conversation with Revify this week. Source: web_fetch of revifyhq.com + Bryan's framing of the partnership shape. Pairs with `docs/gtm/MASTER_PLAN.md` Section V.A.*

---

## What Revify actually is (decoded from marketing)

Despite the "transforming payments into profit" wrap, this is the **dual-pricing / cash-discount surcharge** model.

**Mechanism in plain English:** the customer paying with a card is charged the processing fee on top of the invoice (a $100 invoice becomes $103.30 to the cardholder). The merchant keeps the full $100. Revify also rebates up to 0.75% of total sales monthly back to the merchant from their share of the processor margin.

**They're not a processor themselves** — they're an ISO / reseller sitting on top of an actual underlying processor (which they don't name on the site — ASK).

**Bryan's "50/50 split on bps" framing** maps to: Dispatch becomes a referral channel. You bring hotels onto Revify's processing rails; Revify and Dispatch split the margin Revify earns on those merchants' volume. Effectively a perpetual referral commission.

---

## The brutal truth — boutique-hospitality fit concern

**The dual-pricing model is a poor fit for boutique hospitality** at face value.

Boutique hotels compete on guest experience. Adding a 3-3.5% line-item surcharge at checkout — after a guest has agreed to pay $300/night — feels hostile in a way that gas-station-style cash-discount schemes don't. Marriott, Hyatt, Hilton, IHG don't surcharge. The reason isn't unawareness of the savings; it's that surcharging guests at checkout reads as "we're nickel-and-diming you" in a category where the implied promise is the opposite.

For a boutique competing on hospitality feel, this could be brand-damaging.

### Two ways this MIGHT still work

1. **Surcharge is hidden in rate inflation** (nightly rate quietly bumped 3.5%, no line item) — but then it's not really a surcharge model, it's just standard processing dressed up.
2. **Surcharge applies only to incidentals** (room is normal-priced, but late-checkout fee / minibar / room service get surcharged) — operationally fiddly, partial value.

**Find out which (if either) Revify supports.**

### Plus the better answer

Ask whether Revify has a **non-surcharge tier** — where the hotel pays standard processing and Revify earns from compliance/optimization only. Smaller pie, but the guest sees no surcharge, the hotel sees a slight savings vs their current processor, and Dispatch + Revify still split a smaller margin. **This is the version of the partnership that fits boutique hospitality.**

If yes → partnership viable on operational fit. If no → walk away cleanly.

### Other dealbreaker territory worth probing

- **State legality.** Surcharging is restricted in CT, MA, CO (caps), and NY revised the rules recently. Wisconsin's fine (Jennifer's hotel). If Dispatch's TAM expands to East Coast independents, Revify's coverage matters.
- **PMS integration.** Boutique hotels use Mews, Cloudbeds, ResNexus, or smaller PMSs. They already have payment processors integrated with the PMS. Asking the hotel to swap is high-friction. Does Revify integrate with the PMSs your ICP uses, or are you fighting the PMS layer?
- **The 50/50 needs precise math.** "Of what" matters enormously. 50% of the 0.75% rebate on $1M of annual hotel processing = $3,750/year per hotel. 50% of the full processor margin (interchange + assessment + processor + Revify markup) is a much bigger number. Get it pinned down on real example math.
- **Reputation risk to Dispatch.** If a hotel guest gets hit with a surcharge they didn't expect, the hotel blames Dispatch for the recommendation. Goodwill spend potentially exceeds rev share gain.

---

## "Can Dispatch cover the spread?" — three reads

**(a) Dispatch pays the surcharge directly out of its own revenue** — no. Hotel processing $1M/year × 3.5% = $35K of surcharge. Dispatch's SaaS revenue per hotel is roughly $2-6K/year. Inverted unit economics.

**(b) Dispatch absorbs the surcharge from its 50/50 rev share with Revify** — no. The rev share on a $1M-volume hotel is probably $3,750/year. Can't absorb $35K with $3,750.

**(c) Ask Revify whether they have a non-surcharge tier** — yes, this is the right move. See "Plus the better answer" above.

---

## Walk into the call asking these (in order)

### Block 1 — operating model (15 min)
1. Who's the actual underlying processor?
2. What does the surcharge look like to the end guest at hotel checkout? Visible line item, hidden in rate, or applies-to-incidentals-only?
3. **Do you have a non-surcharge tier where the hotel pays standard processing and you earn from compliance/optimization only?**
4. What states' merchants can legally use this model?
5. What PMS integrations do you have? Mews? Cloudbeds? ResNexus?
6. Walk me through the all-in cost stack on a representative $1M annual processing hotel — what does the merchant pay, in any form?

### Block 2 — partnership economics (15 min)
1. The 50/50 split — define exactly what bps that's a split of, with a worked example.
2. Contract length, exclusivity, termination, what happens to ongoing rev share if Dispatch terminates?
3. Implementation timeline per hotel — onboarding, training, signage, compliance setup?
4. Sales support — do you do co-sell into our hotels, or is it our team selling Revify?
5. Marketing co-op?

### Block 3 — name the elephant (15 min)
1. "Our ICP is boutique hotels competing on guest experience. Surcharging guests at checkout reads as hostile in that segment. How do you handle this in hospitality? Have you served boutique hotels before, and what's the guest reaction been?"

**That last block is the dealbreaker.** If they have a compelling answer (real boutique customers, no guest-complaint pattern, an invisible-pricing option) — proceed to economics. If they don't — politely close the conversation: "the model doesn't fit our ICP today; happy to revisit if you launch a no-surcharge option."

---

## Two yes/no decisions to make separately

**Q1 — Operational fit?** Does Revify work for our hotel ICP?
**Q2 — Partnership economics?** Is the 50/50 attractive for Dispatch?

You can be yes on Q2 and no on Q1 — that's a "thanks but no." You can be yes on Q1 and no on Q2 — that's a "renegotiate." Don't conflate them on the call.

---

## Angel-check angle — real angle, wrong timing for call-2

**Strategic logic checks out:** Dispatch is potentially a customer-acquisition channel for hospitality payments processors. If Dispatch hits even modest scale (50-100 boutique hotels), Revify processes meaningful volume from those rails. A $25-50K angel check buys Revify a stake in their distribution funnel. Same thesis Square Capital used to write into Toast early, same reason payment processors invest in vertical SaaS that bundles payments.

**But asking on call-2, before partnership fit is validated, is a sequencing mistake:**
- Conflates two negotiations (partnership terms + investment terms) when you only want one resolved.
- Shifts conversation focus away from fit-discovery.
- If the partnership turns out to not fit (surcharge issue), you've taken money from someone whose product you can't sell — awkward.
- Reads as impatient on a second call.

### Right play — seed-plant at end of call

End-of-call line, after partnership discussion (and only if Block 3 dealbreaker test goes well):

> "One thing before we wrap — we're starting to think about a strategic angel round to bridge to Series A. Given how aligned the volume thesis is between us, would you want to be in early conversations when that's the right timing?"

That's a low-commitment ask that costs nothing if they say no, and creates a natural reason for a 3rd conversation (which you want anyway to close partnership terms). If they bite, the next call is the angel ask. If they don't, you haven't lost anything.

**Hard rule:** don't pitch the partnership AND ask for the check in the same conversation. Decouple them by at least one call.

---

## Red flags to watch for

- Vague on the underlying processor.
- "Trust us on the math" instead of worked examples.
- Long exclusive contracts pushed for at first conversation.
- Pressure to commit on the call.
- "No fees ever" claims — fees exist somewhere; find them.

---

## One question Bryan should pre-stage with Jennifer

What's the current state of payments at Jennifer's hotel? Specifically:
- Are they on a processor they like or hate?
- Is there an integrated PMS-payments setup already?
- Have they ever considered surcharging? If so, why didn't they?

If she's already paying 3% to a processor she dislikes, Revify's pitch lands harder than if she's neutral on her current setup. Either way, her answer should inform whether Revify gets "yes" or "thanks but no."

---

## Post-call action items (anticipated)

- **Yes on Q1 + Q2:** schedule call-3 within 2 weeks to close terms. Angel seed-plant becomes the angel ask in call-3.
- **Yes on Q1 only (fit yes, econ no):** counter-propose on terms, schedule call-3 for renegotiation.
- **Yes on Q2 only (econ yes, fit no):** politely close. Doc the conversation here for future revisit if Revify ships a non-surcharge tier.
- **No / no:** politely close. No follow-up needed.

In all cases — write the post-call notes here in this brief (extend section "Call-2 outcome — [date]" below) so future GTM sessions have continuity.

---

## Call-2 outcome — [pending; Bryan to add post-call]

*To be filled in after the call. Capture: their answers to Blocks 1-2-3, your reads, the post-call decision (Q1 + Q2), and the seed-plant outcome (if relevant).*

---

## Sources

- [Revify main site](https://www.revifyhq.com/)
- [Revify Pricing](https://www.revifyhq.com/pricing) (worth a separate fetch before the call if there's time)
