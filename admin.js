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

// Live dashboard statistics will be added in the next step.


// ============================================================
// SYSTEM HEALTH
// ============================================================

// Live system health checks will be added after the statistics.


// ============================================================
// START ADMIN PAGE
// ============================================================

initialiseAdminPage();
