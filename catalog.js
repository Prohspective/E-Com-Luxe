/**
 * catalog.js — SERVER-ONLY product catalog.
 * ------------------------------------------
 * This file is used ONLY by /api/create-checkout-session.js to verify
 * prices before charging a customer. It is NOT loaded by any HTML page.
 *
 * IMPORTANT: This must stay in sync with the PRODUCTS array at the top of
 * script.js. Whenever you add/edit/remove a product in script.js, make the
 * same change here (just id + price is enough — that's all checkout needs).
 */

const CATALOG = {
  p1:  128000,
  p2:  96000,
  p3:  74000,
  p4:  88000,
  p5:  165000,
  p6:  62000,
  p7:  94000,
  p8:  41000,
  p9:  178000,
  p10: 58000,
  p11: 69000,
  p12: 49000,
  p13: 49000,
  p14: 49000,
  p15: 49000,
  p16: 185000,
  p17: 68000,
  p18: 52000,
  p19: 45000,
  p20: 32000,
  p21: 98000,
  p22: 210000,
  p23: 36000,
  p24: 47000,
  p25: 54000,
  p26: 72000,
  p27: 46000,
  p28: 82000,
  p29: 43000,
  p30: 94000,
  p31: 39000,
  p32: 42000,
  p33: 64000,
  p34: 56000,
  p35: 51000,
  p36: 35000,
  p37: 125000,
  p38: 62000
};

module.exports = CATALOG;