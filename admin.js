// ============================================================
// SUPABASE INITIALISATION
// ============================================================

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


// ============================================================
// ADMIN PAGE STATE
// ============================================================

let currentAdmin = null;


// ============================================================
// DOM ELEMENTS
// ============================================================

const adminLoading =
  document.getElementById(
    "admin-loading"
  );

const adminDashboard =
  document.getElementById(
    "admin-dashboard"
  );

const backToAlbumButton =
  document.getElementById(
    "back-to-album-btn"
  );


// ============================================================
// ADMIN ACCESS PROTECTION
// ============================================================

function getSavedUser() {
  const savedUser =
    localStorage.getItem(
      "familyAlbumUser"
    );

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(
      savedUser
    );
  } catch (error) {
    console.log(
      "Could not read saved user:",
      error
    );

    localStorage.removeItem(
      "familyAlbumUser"
    );

    return null;
  }
}


function hasAdminAccess(user) {
  const adminWasVerified =
    sessionStorage.getItem(
      "adminVerified"
    ) === "true";

  const userIsAdmin =
    user?.is_admin === true;

  return (
    userIsAdmin &&
    adminWasVerified
  );
}


function redirectToAlbum() {
  window.location.replace(
    "index.html"
  );
}


// ============================================================
// PAGE INITIALISATION
// ============================================================

function initialiseAdminPage() {
  const savedUser =
    getSavedUser();

  if (
    !hasAdminAccess(
      savedUser
    )
  ) {
    redirectToAlbum();

    return;
  }

  currentAdmin =
    savedUser;

  adminLoading.style.display =
    "none";

  adminDashboard.classList.remove(
    "hidden"
  );

  loadDashboardStatistics();
  
}


// ============================================================
// NAVIGATION
// ============================================================

backToAlbumButton.onclick =
  () => {
    window.location.href =
      "index.html";
  };


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

const totalMediaCount =
  document.getElementById(
    "total-media-count"
  );

const photoCount =
  document.getElementById(
    "photo-count"
  );

const videoCount =
  document.getElementById(
    "video-count"
  );

const memberCount =
  document.getElementById(
    "member-count"
  );


function showStatisticsError() {
  totalMediaCount.textContent =
    "—";

  photoCount.textContent =
    "—";

  videoCount.textContent =
    "—";

  memberCount.textContent =
    "—";
}


async function loadDashboardStatistics() {
  try {
    const [
      mediaResult,
      memberResult
    ] = await Promise.all([

      supabaseClient
        .from("photos")
        .select(
          "id, media_type"
        ),

      supabaseClient
        .from("family_members")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "active",
          true
        )

    ]);


    if (mediaResult.error) {
      throw mediaResult.error;
    }

    if (memberResult.error) {
      throw memberResult.error;
    }


    const mediaItems =
      mediaResult.data || [];

    const photos =
      mediaItems.filter(
        item =>
          item.media_type ===
          "photo"
      );

    const videos =
      mediaItems.filter(
        item =>
          item.media_type ===
          "video"
      );


    totalMediaCount.textContent =
      mediaItems.length;

    photoCount.textContent =
      photos.length;

    videoCount.textContent =
      videos.length;

    memberCount.textContent =
      memberResult.count ?? 0;

  } catch (error) {
    console.error(
      "Could not load dashboard statistics:",
      error
    );

    showStatisticsError();
  }
}

// ============================================================
// SYSTEM HEALTH
// ============================================================

// Live system health checks will be added after the statistics.


// ============================================================
// START ADMIN PAGE
// ============================================================

initialiseAdminPage();
