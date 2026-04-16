# Offers Feature Killswitch

## Overview
The offers system includes a restaurant-level killswitch that allows you to instantly disable all offer functionality for a specific restaurant in production without code changes.

## Restaurant Schema
Add this to your restaurant document:
```javascript
{
  // ... existing fields
  featureFlags: {
    isOffersEnabled: true  // Set to false to disable offers
  }
}
```

## How It Works

### When `isOffersEnabled: true` (Default)
- ✅ All offer endpoints work normally
- ✅ `getApplicableOffers` returns available offers
- ✅ `applyOffer` applies offers to cart
- ✅ `removeOffer` removes offers from cart
- ✅ Lazy revalidation runs before checkout

### When `isOffersEnabled: false` (Killswitch Activated)
- 🛑 `applyOffer` - Returns error: "Offers are currently disabled for this restaurant"
- 🛑 `removeOffer` - Returns error: "Offers are currently disabled for this restaurant"
- 📭 `getApplicableOffers` - Returns empty array: `{ offers: [] }`
- ⏭️ Lazy revalidation - Skipped entirely (no database reads)

## Usage

### Disable Offers for a Restaurant
```javascript
// Via Firebase Console or Admin SDK
db.collection('restaurants').doc(restaurantId).update({
    'featureFlags.isOffersEnabled': false
});
```

### Re-enable Offers
```javascript
db.collection('restaurants').doc(restaurantId).update({
    'featureFlags.isOffersEnabled': true
});
```

### Check Current Status
```javascript
const doc = await db.collection('restaurants').doc(restaurantId).get();
const isEnabled = doc.data()?.featureFlags?.isOffersEnabled ?? true;
console.log('Offers enabled:', isEnabled);
```

## Production Rollout Strategy

### Phase 1: Enable for Test Restaurant
```javascript
// Set flag explicitly for your test restaurant
db.collection('restaurants').doc('test_restaurant_id').update({
    'featureFlags.isOffersEnabled': true
});
```

### Phase 2: Monitor and Gradual Rollout
1. Monitor test restaurant for 24-48 hours
2. Enable for 1-2 pilot restaurants
3. Monitor error rates, performance, customer feedback
4. Gradually enable for more restaurants

### Phase 3: Emergency Disable
If issues arise in production:
```javascript
// Instant killswitch - takes effect immediately
db.collection('restaurants').doc(problemRestaurantId).update({
    'featureFlags.isOffersEnabled': false
});
```

## Implementation Details

### Protected Endpoints
- **`applyOffer.js`** - Checks via `assertOffersEnabled()` (throws error if disabled)
- **`removeOffer.js`** - Checks via `assertOffersEnabled()` (throws error if disabled)
- **`getApplicableOffers.js`** - Checks via `isOffersEnabled()` (returns empty if disabled)
- **`createOrUpdateOrder.js`** - Checks via `isOffersEnabled()` (skips revalidation if disabled)

### Helper Module
`offers/offerFeatureGuard.js` provides:
- `assertOffersEnabled(restaurantId)` - Throws error if disabled
- `isOffersEnabled(restaurantId)` - Returns boolean, safe to call

## Default Behavior
⚠️ **Important**: If `featureFlags.isOffersEnabled` is not set, it **defaults to `true`** (enabled).

This means:
- New restaurants automatically have offers enabled
- Existing restaurants without the flag have offers enabled
- You must explicitly set to `false` to disable

## Migration Script (Optional)
To set the flag for all existing restaurants:
```javascript
const batch = db.batch();
const restaurants = await db.collection('restaurants').get();

restaurants.forEach(doc => {
    batch.update(doc.ref, {
        'featureFlags.isOffersEnabled': true  // or false for cautious rollout
    });
});

await batch.commit();
```

## Monitoring
Monitor these logs in production:
- `"📢 OFFERS: Offers disabled for restaurant {id}"` - Indicates killswitch activation
- Search for `isOffersEnabled` in logs to track usage

## Best Practices
1. **Test thoroughly** before enabling in production
2. **Monitor error rates** after enabling for new restaurants
3. **Have the killswitch command ready** before major releases
4. **Document why** you disabled offers (e.g., in a Slack channel)
5. **Re-enable gradually** after fixes are deployed
