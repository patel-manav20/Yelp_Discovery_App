// Initialize MongoDB collections and indexes

db = db.getSiblingDB('yelp');

// Create users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });

// Create sessions collection
db.createCollection('sessions');
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Create restaurants collection
db.createCollection('restaurants');
db.restaurants.createIndex({ name: 1 });
db.restaurants.createIndex({ yelp_id: 1 }, { unique: true, sparse: true });
db.restaurants.createIndex({ ownerId: 1 });
db.restaurants.createIndex({ createdAt: 1 });

// Create reviews collection
db.createCollection('reviews');
db.reviews.createIndex({ restaurantId: 1 });
db.reviews.createIndex({ userId: 1 });
db.reviews.createIndex({ rating: 1 });
db.reviews.createIndex({ createdAt: 1 });

// Create favorites collection
db.createCollection('favorites');
db.favorites.createIndex({ userId: 1, restaurantId: 1 }, { unique: true });
db.favorites.createIndex({ userId: 1 });

// Create photos collection
db.createCollection('photos');
db.photos.createIndex({ restaurantId: 1 });
db.photos.createIndex({ uploadedBy: 1 });

// Create preferences collection
db.createCollection('preferences');
db.preferences.createIndex({ userId: 1 }, { unique: true });

print('MongoDB collections and indexes initialized successfully');