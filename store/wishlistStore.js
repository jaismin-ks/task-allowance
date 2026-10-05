// store/wishlistStore.js
import { create } from 'zustand';
import { sqlite } from '../db/client';
import { redeemGoal } from '../db/operations/wishlist';
import { deleteItemPhoto } from '../lib/itemPhotos';

const SELECT = `SELECT id, product_url AS productUrl, title, image_url AS imageUrl, price, currency,
  priority_flag AS priorityFlag, scrape_status AS scrapeStatus, purchased_at AS purchasedAt,
  added_at AS addedAt FROM wishlist_item`;

const normalise = (row) => row && { ...row, priorityFlag: !!row.priorityFlag };

export function getItem(id) {
  return normalise(sqlite.getFirstSync(`${SELECT} WHERE id = ?`, [id]));
}

export function getGoal() {
  return normalise(sqlite.getFirstSync(`${SELECT} WHERE priority_flag = 1 AND purchased_at IS NULL`));
}

// An item "needs details" when it can't show progress yet
export const needsDetails = (item) => !item.purchasedAt && !(item.price > 0);

function setPrioritySync(itemId) {
  sqlite.runSync(`UPDATE wishlist_item SET priority_flag = 0 WHERE priority_flag = 1`);
  sqlite.runSync(`UPDATE wishlist_item SET priority_flag = 1 WHERE id = ?`, [itemId]);
}

export const useWishlistStore = create((set, get) => ({
  goal: null,
  others: [], // not goal, not purchased — newest first
  purchased: [], // "Got it" section
  loaded: false,
  loadItems: () => {
    const all = sqlite.getAllSync(`${SELECT} ORDER BY added_at DESC, rowid DESC`).map(normalise);
    set({
      goal: all.find((i) => i.priorityFlag && !i.purchasedAt) ?? null,
      others: all.filter((i) => !i.priorityFlag && !i.purchasedAt),
      purchased: all.filter((i) => i.purchasedAt),
      loaded: true,
    });
  },
  // Insert + optional "Make this my goal" in one transaction (spec S9)
  addItem: ({ productUrl, title, price, imageUrl, currency, scrapeStatus, makeGoal }) => {
    let id;
    sqlite.withTransactionSync(() => {
      id = sqlite.getFirstSync(
        `INSERT INTO wishlist_item (product_url, title, price, image_url, currency, scrape_status)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        [productUrl || null, title, price, imageUrl || null, currency || null, scrapeStatus]
      ).id;
      if (makeGoal) setPrioritySync(id);
    });
    get().loadItems();
    return id;
  },
  updateItem: (id, { productUrl, title, price, imageUrl, currency }) => {
    const previous = getItem(id)?.imageUrl;
    sqlite.runSync(
      `UPDATE wishlist_item SET product_url = ?, title = ?, price = ?, image_url = ?, currency = ?
       WHERE id = ?`,
      [productUrl || null, title, price, imageUrl || null, currency || null, id]
    );
    // Replaced or removed a picked photo → delete the old file
    if (previous && previous !== imageUrl) deleteItemPhoto(previous);
    get().loadItems();
  },
  setPriority: (itemId) => {
    sqlite.withTransactionSync(() => setPrioritySync(itemId));
    get().loadItems();
  },
  redeem: (itemId) => {
    redeemGoal(itemId);
    get().loadItems();
  },
  // Earned money belongs to the pool, not the item — removing never touches totals
  deleteItem: (itemId) => {
    const photo = getItem(itemId)?.imageUrl;
    sqlite.runSync(`DELETE FROM wishlist_item WHERE id = ?`, [itemId]);
    deleteItemPhoto(photo);
    get().loadItems();
  },
}));
