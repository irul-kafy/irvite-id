import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gardenMapsUrl,
  gardenPhotos,
  gardenCountdown,
  gardenDate,
  gardenMediaSrc,
} from "./themes/ivory-garden-model";

test("maps accepts Google Maps links but rejects lookalikes and executable URLs", () => {
  for (const raw of [
    "https://maps.app.goo.gl/abc",
    "https://www.google.com/maps/place/Jakarta",
  ]) {
    assert.equal(gardenMapsUrl(raw, null), raw);
  }
  for (const raw of [
    "javascript:alert(1)",
    "https://google.com.evil.com/maps",
    "https://google.com/url?q=evil",
    "https://user@maps.google.com/",
    "http://maps.google.com",
  ]) {
    assert.equal(gardenMapsUrl(raw, null), null);
  }
  assert.equal(
    gardenMapsUrl(undefined, "Gedung A & B"),
    "https://www.google.com/maps/search/?api=1&query=Gedung%20A%20%26%20B",
  );
});

test("gallery is limited to three photos, ordered, and never includes gift image", () => {
  const media = [5, 2, 3, 1, 4].map((order) => ({
    type: "PHOTO" as const,
    order,
    src: `/media/${order}`,
  }));
  assert.deepEqual(
    gardenPhotos(media, "/media/2").map((item) => item.order),
    [1, 3, 4],
  );
  assert.deepEqual(
    media.map((item) => item.order),
    [5, 2, 3, 1, 4],
  );
  assert.equal(gardenMediaSrc("//evil.test/image"), undefined);
  assert.equal(gardenMediaSrc("/\\evil.test"), undefined);
});

test("countdown clamps elapsed events and dates use the event timezone", () => {
  assert.deepEqual(
    gardenCountdown("2026-12-20T00:00:00Z", Date.parse("2026-12-18T22:58:57Z")),
    [1, 1, 1, 3],
  );
  assert.deepEqual(gardenCountdown("2020-01-01", Date.now()), [0, 0, 0, 0]);
  assert.deepEqual(gardenCountdown("invalid", Date.now()), [0, 0, 0, 0]);
  assert.match(
    gardenDate("2026-12-19T18:00:00Z", "Asia/Jakarta"),
    /20 Desember 2026/,
  );
});
