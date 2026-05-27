
// আপনার ক্যাশ মেমরির নাম (ভার্সন পরিবর্তন করলে এটি পরিবর্তন করবেন)
const CACHE_NAME = "n-gen-v1";

// 🛠️ এখানে শুধু "/icon.svg" ফাইলটি যোগ করে দেওয়া হয়েছে
const ASSETS = [
  "/", 
  "/index.html", 
  "/manifest.json", 
  "/icon.svg" // নতুন লোগোটি এখানে ক্যাশ করার জন্য যুক্ত হলো
];

// ইনস্টল ইভেন্ট: ফাইলগুলো ব্রাউজার ক্যাশে সেভ করা
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// ফেচ ইভেন্ট: অফলাইনে থাকলে ক্যাশ থেকে ফাইল দেওয়া, অনলাইনে থাকলে ইন্টারনেট থেকে আনা
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});

// অ্যাক্টিভেট ইভেন্ট: পুরোনো ক্যাশ মেমরি ডিলিট করে ক্লিন রাখা
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});