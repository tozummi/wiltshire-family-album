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
  loadSystemHealth();
  loadRecentActivity();
  
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

const databaseStatus =
  document.getElementById(
    "database-status"
  );

const albumPinStatus =
  document.getElementById(
    "album-pin-status"
  );

const adminPinStatus =
  document.getElementById(
    "admin-pin-status"
  );


function setHealthStatus(
  element,
  message,
  status
) {
  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.remove(
    "status-good",
    "status-warning",
    "status-error"
  );

  element.classList.add(
    status
  );
}


async function loadSystemHealth() {
  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("settings")
      .select("key, value")
      .in(
        "key",
        [
          "album_pin",
          "admin_pin"
        ]
      );

    if (error) {
      throw error;
    }


    setHealthStatus(
      databaseStatus,
      "Connected",
      "status-good"
    );


    const settings = {};

    (data || []).forEach(
      setting => {
        settings[
          setting.key
        ] = setting.value;
      }
    );


    const albumPinExists =
      String(
        settings.album_pin || ""
      ).trim().length > 0;

    const adminPinExists =
      String(
        settings.admin_pin || ""
      ).trim().length > 0;


    setHealthStatus(
      albumPinStatus,
      albumPinExists
        ? "Configured"
        : "Not configured",
      albumPinExists
        ? "status-good"
        : "status-warning"
    );


    setHealthStatus(
      adminPinStatus,
      adminPinExists
        ? "Configured"
        : "Not configured",
      adminPinExists
        ? "status-good"
        : "status-warning"
    );

  } catch (error) {
    console.error(
      "Could not check system health:",
      error
    );

    setHealthStatus(
      databaseStatus,
      "Connection issue",
      "status-error"
    );

    setHealthStatus(
      albumPinStatus,
      "Unable to check",
      "status-error"
    );

    setHealthStatus(
      adminPinStatus,
      "Unable to check",
      "status-error"
    );
  }
}

// ============================================================
// RECENT ACTIVITY
// ============================================================

const recentActivityList =
  document.getElementById(
    "recent-activity-list"
  );


function escapeActivityText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatActivityTime(dateValue) {
  const uploadDate =
    new Date(dateValue);

  const now =
    new Date();

  const differenceMilliseconds =
    now - uploadDate;

  const differenceMinutes =
    Math.floor(
      differenceMilliseconds /
      60000
    );

  const differenceHours =
    Math.floor(
      differenceMinutes /
      60
    );

  const differenceDays =
    Math.floor(
      differenceHours /
      24
    );


  if (differenceMinutes < 1) {
    return "Just now";
  }

  if (differenceMinutes < 60) {
    return `${differenceMinutes} min ago`;
  }

  if (differenceHours < 24) {
    return differenceHours === 1
      ? "1 hour ago"
      : `${differenceHours} hours ago`;
  }

  if (differenceDays === 1) {
    return "Yesterday";
  }

  if (differenceDays < 7) {
    return `${differenceDays} days ago`;
  }


  return uploadDate.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


function getActivityIcon(mediaType) {
  return mediaType === "video"
    ? "🎥"
    : "📸";
}


function getActivityMessage(item) {
  const uploaderName =
    escapeActivityText(
      item.user_name ||
      "A family member"
    );

  const mediaLabel =
    item.media_type === "video"
      ? "a video"
      : "a photo";

  return `
    <strong>${uploaderName}</strong>
    uploaded ${mediaLabel}
  `;
}


function showActivityError() {
  if (!recentActivityList) {
    return;
  }

  recentActivityList.innerHTML = `
    <div class="activity-empty">
      <span class="activity-empty-icon">
        ⚠️
      </span>

      <p>
        Recent activity could not be loaded.
      </p>
    </div>
  `;
}


async function loadRecentActivity() {
  if (!recentActivityList) {
    return;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("photos")
      .select(`
        id,
        user_name,
        media_type,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(5);


    if (error) {
      throw error;
    }


    const activityItems =
      data || [];


    if (
      activityItems.length === 0
    ) {
      recentActivityList.innerHTML = `
        <div class="activity-empty">
          <span class="activity-empty-icon">
            🌿
          </span>

          <p>
            No recent activity yet.
          </p>
        </div>
      `;

      return;
    }


    recentActivityList.innerHTML =
      activityItems
        .map(item => {
          const icon =
            getActivityIcon(
              item.media_type
            );

          const message =
            getActivityMessage(item);

          const time =
            formatActivityTime(
              item.created_at
            );

          return `
            <article class="activity-item">
              <span class="activity-icon">
                ${icon}
              </span>

              <div class="activity-details">
                <p class="activity-message">
                  ${message}
                </p>

                <p class="activity-time">
                  ${time}
                </p>
              </div>
            </article>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Could not load recent activity:",
      error
    );

    showActivityError();
  }
}

// ============================================================
// ACTIVITY VIEW
// ============================================================

const dashboardView =
  document.getElementById(
    "dashboard-view"
  );

const activityView =
  document.getElementById(
    "activity-view"
  );

const openActivityButton =
  document.getElementById(
    "open-activity-btn"
  );

const activityBackButton =
  document.getElementById(
    "activity-back-btn"
  );

const fullActivityList =
  document.getElementById(
    "full-activity-list"
  );


function showDashboardView() {
  if (activityView) {
    activityView.hidden = true;
  }

  if (dashboardView) {
    dashboardView.hidden = false;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function showActivityView() {
  if (dashboardView) {
    dashboardView.hidden = true;
  }

  if (activityView) {
    activityView.hidden = false;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  await loadFullActivity();
}


async function loadFullActivity() {
  if (!fullActivityList) {
    return;
  }

  fullActivityList.innerHTML = `
    <p class="activity-loading">
      Loading activity...
    </p>
  `;

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("photos")
      .select(`
        id,
        user_name,
        media_type,
        caption,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(50);

    if (error) {
      throw error;
    }

    const activityItems =
      data || [];

    if (
      activityItems.length === 0
    ) {
      fullActivityList.innerHTML = `
        <div class="activity-empty">
          <span class="activity-empty-icon">
            🌿
          </span>

          <p>
            No activity yet.
          </p>
        </div>
      `;

      return;
    }

    fullActivityList.innerHTML =
      activityItems
        .map(item => {
          const icon =
            getActivityIcon(
              item.media_type
            );

          const message =
            getActivityMessage(item);

          const time =
            formatActivityTime(
              item.created_at
            );

          const caption =
            item.caption
              ? `
                <p class="activity-caption">
                  “${escapeActivityText(
                    item.caption
                  )}”
                </p>
              `
              : "";

          return `
            <article class="activity-item">
              <span class="activity-icon">
                ${icon}
              </span>

              <div class="activity-details">
                <p class="activity-message">
                  ${message}
                </p>

                ${caption}

                <p class="activity-time">
                  ${time}
                </p>
              </div>
            </article>
          `;
        })
        .join("");

  } catch (error) {
    console.error(
      "Could not load full activity:",
      error
    );

    fullActivityList.innerHTML = `
      <div class="activity-empty">
        <span class="activity-empty-icon">
          ⚠️
        </span>

        <p>
          Activity could not be loaded.
        </p>
      </div>
    `;
  }
}


if (openActivityButton) {
  openActivityButton.addEventListener(
    "click",
    showActivityView
  );
}


if (activityBackButton) {
  activityBackButton.addEventListener(
    "click",
    showDashboardView
  );
}

// ============================================================
// MEDIA VIEW
// ============================================================

const mediaView =
  document.getElementById(
    "media-view"
  );

const openMediaButton =
  document.getElementById(
    "open-media-btn"
  );

const mediaBackButton =
  document.getElementById(
    "media-back-btn"
  );


async function showMediaView() {
  if (dashboardView) {
    dashboardView.hidden = true;
  }

  if (activityView) {
    activityView.hidden = true;
  }

  if (mediaView) {
    mediaView.hidden = false;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (
    typeof loadAdminMedia ===
    "function"
  ) {
    await loadAdminMedia();
  }
}


function returnToDashboardFromMedia() {
  if (mediaView) {
    mediaView.hidden = true;
  }

  if (activityView) {
    activityView.hidden = true;
  }

  if (dashboardView) {
    dashboardView.hidden = false;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


if (openMediaButton) {
  openMediaButton.addEventListener(
    "click",
    showMediaView
  );
}


if (mediaBackButton) {
  mediaBackButton.addEventListener(
    "click",
    returnToDashboardFromMedia
  );
}

// ============================================================
// START ADMIN PAGE
// ============================================================

initialiseAdminPage();
