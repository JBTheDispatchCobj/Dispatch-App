import type { CardType, ChecklistNode } from "../types";

// Single Queen room checklist trees.
// Applies to rooms: 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41.
//
// Source: Jennifer's KB docs (Standard Stayover Checklist - Queen Room,
// Standard Arrival Checklist - Queen Room, Standard Departure).
// Section structure and item titles are canonical to Jennifer's outline.
// Detail bodies marked "Text to come" are pending Jennifer's authoring pass.
// Tools / Chemicals / Photo flags reflect what she's specified so far.
//
// Other room classes (double, ada_double, jacuzzi, ada_jacuzzi, suite) extend
// the relevant sub-trees of this base via their own variant files, adding
// class-specific items per the "Alternatives to the standard lists" doc.

const PLACEHOLDER_DETAIL = "Text to come";

export const singleQueenChecklists: Record<CardType, ChecklistNode> = {
  // ===========================================================================
  // Departure / Housekeeping Turn — full room turnover for next guest
  // ===========================================================================
  housekeeping_turn: {
    id: "hk_turn.root",
    label: "Standard Departure — Single Queen",
    detail:
      "Full turn for a checking-out single queen room (21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41). Departure rooms with a same-day arrival take priority.",
    children: [
      {
        id: "hk_turn.open_strip",
        label: "Open / Strip",
        children: [
          { id: "hk_turn.open_strip.knock", label: "Knock", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.open_strip.announce", label: "Announce", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.open_strip.enter", label: "Enter room", detail: PLACEHOLDER_DETAIL },
          {
            id: "hk_turn.open_strip.lock",
            label: "Check lock",
            detail: PLACEHOLDER_DETAIL,
            tools: [PLACEHOLDER_DETAIL],
          },
          { id: "hk_turn.open_strip.linens", label: "Strip linens", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.open_strip.towels", label: "Strip towels", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.open_strip.trash", label: "Empty trash", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "hk_turn.bed",
        label: "Bed",
        children: [
          { id: "hk_turn.bed.sheets", label: "Sheets", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.bed.duvet", label: "Duvet", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.bed.pillows", label: "Pillows", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.bed.make", label: "How to make bed", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "hk_turn.report_doc",
        label: "Report & Document",
        children: [
          {
            id: "hk_turn.report_doc.damages",
            label: "Damages",
            children: [
              {
                id: "hk_turn.report_doc.damages.appliances",
                label: "Damaged Appliances",
                children: [
                  {
                    id: "hk_turn.report_doc.damages.appliances.tv",
                    label: "TV",
                    children: [
                      {
                        id: "hk_turn.report_doc.damages.appliances.tv.screen",
                        label: "TV Screen — Broken",
                        detail: PLACEHOLDER_DETAIL,
                        photo: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          { id: "hk_turn.report_doc.lost_found", label: "Lost & Found", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "hk_turn.report_doc.guest_notes", label: "Guest Notes", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
        ],
      },
      {
        id: "hk_turn.prep",
        label: "Prep",
        children: [
          {
            id: "hk_turn.prep.temperature",
            label: "Temperature",
            children: [
              { id: "hk_turn.prep.temperature.set", label: "How to set", detail: PLACEHOLDER_DETAIL },
              { id: "hk_turn.prep.temperature.when", label: "When to set", detail: PLACEHOLDER_DETAIL },
              { id: "hk_turn.prep.temperature.broken", label: "If not working", detail: PLACEHOLDER_DETAIL },
            ],
          },
          {
            id: "hk_turn.prep.odoban",
            label: "Odoban",
            children: [
              { id: "hk_turn.prep.odoban.bathroom", label: "Bathroom", detail: PLACEHOLDER_DETAIL, chemicals: ["Odoban"] },
              { id: "hk_turn.prep.odoban.bedroom", label: "Bedroom", detail: PLACEHOLDER_DETAIL, chemicals: ["Odoban"] },
              { id: "hk_turn.prep.odoban.closet", label: "Closet", detail: PLACEHOLDER_DETAIL, chemicals: ["Odoban"] },
            ],
          },
        ],
      },
      {
        id: "hk_turn.clean",
        label: "Clean",
        children: [
          { id: "hk_turn.clean.sink", label: "Sink", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.clean.toilet", label: "Toilet", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.clean.shower", label: "Shower", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.clean.floor", label: "Floor", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.clean.surfaces", label: "Surfaces", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.clean.mirrors", label: "Mirrors", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
        ],
      },
      {
        id: "hk_turn.close_out",
        label: "Close Out",
        children: [
          {
            id: "hk_turn.close_out.spray",
            label: "Room Spray",
            children: [
              {
                id: "hk_turn.close_out.spray.seasonal",
                label: "Seasonal Scents",
                children: [
                  { id: "hk_turn.close_out.spray.fall", label: "Sept 5 – Nov 10", detail: "Apple Orchard" },
                  { id: "hk_turn.close_out.spray.winter", label: "Nov 11 – Jan 5", detail: "Fir Tree" },
                  { id: "hk_turn.close_out.spray.spring", label: "Jan 6 – Apr 30", detail: "The One" },
                  { id: "hk_turn.close_out.spray.summer", label: "May 1 – Sept 4", detail: "Day Dream" },
                ],
              },
              {
                id: "hk_turn.close_out.spray.where",
                label: "Where to spray",
                detail:
                  "A queen room receives 3 pumps: 1 in the main body between the bed and dresser, 1 in the bathroom door opening, 1 in the space between the sink, bathroom door, and closet just as the room door is closing.",
              },
            ],
          },
          {
            id: "hk_turn.close_out.door_hanger",
            label: "Housekeeping door hanger",
            detail: PLACEHOLDER_DETAIL,
            tools: [PLACEHOLDER_DETAIL],
            photo: true,
          },
          { id: "hk_turn.close_out.handle", label: "Door handle", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.close_out.close", label: "Door close", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.close_out.lock", label: "Check lock", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "hk_turn.restock",
        label: "Restock",
        children: [
          { id: "hk_turn.restock.trash_liners", label: "Trash liners", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
          { id: "hk_turn.restock.toilet_paper", label: "Toilet paper", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "hk_turn.restock.tissue", label: "Tissue", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "hk_turn.restock.amenities", label: "Amenities", detail: PLACEHOLDER_DETAIL },
          { id: "hk_turn.restock.linens", label: "Linens", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "hk_turn.restock.special", label: "Special / VIP", detail: PLACEHOLDER_DETAIL },
        ],
      },
    ],
  },

  // ===========================================================================
  // Arrival — pre-check-in setup for single queen room
  // ===========================================================================
  arrival: {
    id: "arrival.root",
    label: "Standard Arrival — Single Queen",
    detail:
      "Pre-arrival check for a single queen room (21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41). Starts 11am weekdays, 12pm weekends. All arrivals must be checked by 2pm. Cards generate even if the room was cleaned earlier today.",
    children: [
      {
        id: "arrival.open_room",
        label: "Open Room",
        children: [
          { id: "arrival.open_room.knock", label: "Knock", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.open_room.announce", label: "Announce", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.open_room.respond_yes", label: "If they respond", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.open_room.respond_no", label: "If they don't respond but are in room", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.open_room.enter", label: "Enter room", detail: PLACEHOLDER_DETAIL },
          {
            id: "arrival.open_room.lock",
            label: "Check lock",
            detail: PLACEHOLDER_DETAIL,
            chemicals: [PLACEHOLDER_DETAIL],
            tools: [PLACEHOLDER_DETAIL],
          },
          { id: "arrival.open_room.report", label: "Report & Document", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.open_room.guest_notes", label: "Guest Notes", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "arrival.notes_check",
        label: "Arrival Notes — Check before proceeding",
        detail: "Confirm each of these in the app before starting the arrival check.",
        children: [
          { id: "arrival.notes_check.temp", label: "Temp", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.requested_items", label: "Requested items", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.scents", label: "Sprays / Scents", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.magic", label: "Magic", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.longterm", label: "Long-term", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.contractor", label: "Contractor / *** guest", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.notes_check.cleaned_today", label: "Was this room cleaned today already?", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "arrival.prep",
        label: "Prep",
        children: [
          {
            id: "arrival.prep.temperature",
            label: "Temperature",
            children: [
              { id: "arrival.prep.temperature.set", label: "How to set", detail: PLACEHOLDER_DETAIL },
              { id: "arrival.prep.temperature.when", label: "When to set", detail: PLACEHOLDER_DETAIL },
              { id: "arrival.prep.temperature.broken", label: "If not working", detail: PLACEHOLDER_DETAIL },
            ],
          },
          {
            id: "arrival.prep.odoban",
            label: "Odoban",
            children: [
              { id: "arrival.prep.odoban.notes", label: "If Arrival Notes", detail: PLACEHOLDER_DETAIL },
              { id: "arrival.prep.odoban.bathroom", label: "Bathroom", detail: PLACEHOLDER_DETAIL, chemicals: ["Odoban"] },
              {
                id: "arrival.prep.odoban.bedroom",
                label: "Bedroom",
                detail: PLACEHOLDER_DETAIL,
                chemicals: ["Odoban"],
                children: [
                  { id: "arrival.prep.odoban.bedroom.bed", label: "Bed", detail: PLACEHOLDER_DETAIL },
                  { id: "arrival.prep.odoban.bedroom.chairs", label: "Chairs", detail: PLACEHOLDER_DETAIL },
                  { id: "arrival.prep.odoban.bedroom.curtains", label: "Curtains", detail: PLACEHOLDER_DETAIL },
                ],
              },
              { id: "arrival.prep.odoban.closet", label: "Closet", detail: PLACEHOLDER_DETAIL, chemicals: ["Odoban"] },
            ],
          },
          {
            id: "arrival.prep.curtains",
            label: "Curtains",
            children: [{ id: "arrival.prep.curtains.close_to", label: "Close to", detail: PLACEHOLDER_DETAIL, photo: true }],
          },
          {
            id: "arrival.prep.switches",
            label: "Switches",
            children: [{ id: "arrival.prep.switches.direction", label: "Direction", detail: PLACEHOLDER_DETAIL, photo: true }],
          },
          {
            id: "arrival.prep.toilet",
            label: "Toilet",
            children: [{ id: "arrival.prep.toilet.flush", label: "Flush", detail: PLACEHOLDER_DETAIL }],
          },
          {
            id: "arrival.prep.dust",
            label: "Dust",
            children: [{ id: "arrival.prep.dust.check", label: "Check for dust", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] }],
          },
        ],
      },
      {
        id: "arrival.double_check",
        label: "Double Check",
        detail: "Look around, double check.",
        children: [
          { id: "arrival.double_check.dust", label: "Dust", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.double_check.tissue", label: "Tissue", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.tp", label: "Toilet paper", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.dresser", label: "Dresser & table placement", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.double_check.sink_items", label: "Sink items", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.linens", label: "Linens", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.bed", label: "Bed", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.trash", label: "Trash", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "arrival.double_check.floor", label: "Floor", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.double_check.walls", label: "Walls", detail: PLACEHOLDER_DETAIL },
          { id: "arrival.double_check.chocolate", label: "Chocolate", detail: PLACEHOLDER_DETAIL, photo: true },
        ],
      },
      {
        id: "arrival.spray",
        label: "Room Spray",
        children: [
          {
            id: "arrival.spray.notes",
            label: "If Arrival Notes",
            children: [
              { id: "arrival.spray.notes.sensitive", label: "If sensitive", detail: PLACEHOLDER_DETAIL },
              { id: "arrival.spray.notes.preference", label: "If has preference", detail: PLACEHOLDER_DETAIL },
            ],
          },
          {
            id: "arrival.spray.seasonal",
            label: "Seasonal Scents",
            children: [
              { id: "arrival.spray.fall", label: "Sept 5 – Nov 10", detail: "Apple Orchard" },
              { id: "arrival.spray.winter", label: "Nov 11 – Jan 5", detail: "Fir Tree" },
              { id: "arrival.spray.spring", label: "Jan 6 – Apr 30", detail: "The One" },
              { id: "arrival.spray.summer", label: "May 1 – Sept 4", detail: "Day Dream" },
            ],
          },
          {
            id: "arrival.spray.where",
            label: "Where to spray",
            detail:
              "A queen room receives 3 pumps: 1 in the main body between the bed and dresser, 1 in the bathroom door opening, 1 in the space between the sink, bathroom door, and closet just as the room door is closing.",
          },
        ],
      },
      {
        id: "arrival.door",
        label: "Door",
        children: [
          {
            id: "arrival.door.handles",
            label: "Handles",
            children: [
              { id: "arrival.door.handles.wipe", label: "Wipe down", detail: PLACEHOLDER_DETAIL },
              { id: "arrival.door.handles.lock", label: "Check lock", detail: PLACEHOLDER_DETAIL },
            ],
          },
          {
            id: "arrival.door.sign",
            label: "Hanging sign",
            children: [
              { id: "arrival.door.sign.side", label: "Side to display", detail: PLACEHOLDER_DETAIL, photo: true },
              { id: "arrival.door.sign.hang", label: "Hanging", detail: PLACEHOLDER_DETAIL, photo: true },
            ],
          },
          {
            id: "arrival.door.close",
            label: "Close",
            children: [
              { id: "arrival.door.close.firmly", label: "Softly but firmly close", detail: PLACEHOLDER_DETAIL },
              {
                id: "arrival.door.close.lock",
                label: "Check lock",
                detail: PLACEHOLDER_DETAIL,
                children: [{ id: "arrival.door.close.lock.broken", label: "If does not work", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] }],
              },
              { id: "arrival.door.close.wipe", label: "Wipe handle", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
            ],
          },
        ],
      },
    ],
  },

  // ===========================================================================
  // Stayover — refresh service for single queen room mid-stay
  // ===========================================================================
  stayover: {
    id: "stayover.root",
    label: "Standard Stayover — Single Queen",
    detail:
      "Refresh service for a single queen room (21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41) mid-stay. Starts 11am weekdays, 12pm weekends. Departure rooms with arrivals scheduled take priority over stayovers.",
    children: [
      {
        id: "stayover.status",
        label: "Status",
        children: [
          { id: "stayover.status.dnd", label: "DND", detail: PLACEHOLDER_DETAIL, photo: true },
          { id: "stayover.status.guest_notes", label: "Guest notes on card", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.status.documenting", label: "What each status means when documenting", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "stayover.open_room",
        label: "Open Room",
        children: [
          { id: "stayover.open_room.knock", label: "Knock", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.announce", label: "Announce", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.respond_yes", label: "If they respond", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.respond_no", label: "If they don't respond but are in room", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.enter", label: "Enter room", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.lock", label: "Check lock", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.open_room.report", label: "Report & Document", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.open_room.guest_notes", label: "Guest Notes", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
        ],
      },
      {
        id: "stayover.remove",
        label: "Remove",
        children: [
          { id: "stayover.remove.trash", label: "Trash", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.remove.used_items", label: "Used items", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.remove.what_to_leave", label: "What to leave", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.remove.when_to_ask", label: "When to ask", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.remove.laundry", label: "Laundry", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
        ],
      },
      {
        id: "stayover.replace",
        label: "Replace",
        children: [
          { id: "stayover.replace.trash_liners", label: "Trash Liners", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.replace.low_stock", label: "Low Stock", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.replace.special", label: "Special", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "stayover.bed",
        label: "Bed",
        children: [
          { id: "stayover.bed.when_make", label: "When to make bed", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.bed.when_not_make", label: "When not to make bed", detail: PLACEHOLDER_DETAIL },
          { id: "stayover.bed.how", label: "How to make bed", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "stayover.clean",
        label: "Clean",
        children: [
          { id: "stayover.clean.sink", label: "Sink", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.clean.toilet", label: "Toilet", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.clean.floor", label: "Floor", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.clean.other", label: "Other", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
        ],
      },
      {
        id: "stayover.close",
        label: "Close",
        children: [
          { id: "stayover.close.spray", label: "Room Spray", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL] },
          { id: "stayover.close.door_hanger", label: "Housekeeping door hanger", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL], photo: true },
          { id: "stayover.close.handle", label: "Door handle", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
          { id: "stayover.close.door_close", label: "Door close", detail: PLACEHOLDER_DETAIL },
        ],
      },
      {
        id: "stayover.app",
        label: "Card in App",
        children: [{ id: "stayover.app.protocol", label: "App Protocol", detail: PLACEHOLDER_DETAIL }],
      },
    ],
  },

  // ===========================================================================
  // Bucket-level cards (not room-specific) — placeholders for now.
  // These card types render at /staff/task/[id] but the drill-down tree isn't
  // class-specific. Fill in when Jennifer authors content for them.
  // ===========================================================================
  dailys: {
    id: "dailys.root",
    label: "Property round (Dailys)",
    detail: "Routine property work — content pending.",
    children: [],
  },
  eod: {
    id: "eod.root",
    label: "End of Day",
    detail: "Shift wrap and handoff — content pending.",
    children: [],
  },
  maintenance: {
    id: "maintenance.root",
    label: "Maintenance",
    detail: "Maintenance issue — content pending.",
    children: [],
  },
  general_report: {
    id: "general_report.root",
    label: "General Report",
    detail: "Generic report card — content pending.",
    children: [],
  },
};
