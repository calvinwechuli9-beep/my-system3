const { createClient } = require("@supabase/supabase-js");

let client;

function storage() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      );
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).storage.from(process.env.SUPABASE_STORAGE_BUCKET || "title-deeds");
  }
  return client;
}

async function uploadDeed(file) {
  const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
  const key = `${Date.now()}_${safeName}`;
  const { error } = await storage().upload(key, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw error;
  return key;
}

module.exports = { uploadDeed };
