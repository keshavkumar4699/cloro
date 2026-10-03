import { describe, expect, it } from "vitest";
import { detectOffPlatform } from "@/lib/contact-filter";

describe("off-platform detection", () => {
  it.each([
    ["call me on 98765 43210", "phone number"],
    ["+91-9876543210", "phone number"],
    ["pay to rahul@okaxis", "UPI ID"],
    ["mail me at a.b@gmail.com", "email address"],
    ["check www.example.com", "link"],
    ["ping me on whatsapp", "outside app"],
    ["scan this QR to receive the money", "QR payment"],
  ])("flags %s", (text, kind) => {
    expect(detectOffPlatform(text)).toContain(kind);
  });

  it.each(["Is the jacket size M?", "Can you do a video call at 6pm?", "Chest is 52 cm, length 70 cm", "Bid ₹1500"])(
    "allows %s",
    (text) => expect(detectOffPlatform(text)).toEqual([]),
  );
});
