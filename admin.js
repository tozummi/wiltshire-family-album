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
  loadAdminDailyLimit();
  loadAdminR2StorageUsage();
  
  history.replaceState(
  {
    adminView: "dashboard-view"
  },
  ""
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

// ============================================================
// ADMIN VIEW NAVIGATION
// ============================================================

function hideAllAdminViews() {
  const adminViews =
    document.querySelectorAll(
      "#dashboard-view, .admin-view"
    );

  adminViews.forEach(view => {
    view.hidden = true;
  });
}


function showAdminView(
  view,
  addToHistory = true
) {
  hideAllAdminViews();

  if (!view) {
    return;
  }

  view.hidden = false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (addToHistory) {
    history.pushState(
      {
        adminView: view.id
      },
      ""
    );
  }
}


function showDashboardView() {
  showAdminView(
    dashboardView
  );
}


async function showActivityView() {
  showAdminView(
    activityView
  );

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
  showAdminView(
    mediaView
  );

  if (
    typeof loadAdminMedia ===
    "function"
  ) {
    await loadAdminMedia();
  }
}


function returnToDashboardFromMedia() {
  showDashboardView();
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
// MEDIA MANAGEMENT
// ============================================================

const adminMediaGrid =
  document.getElementById(
    "admin-media-grid"
  );

const mediaSearchInput =
  document.getElementById(
    "media-search-input"
  );

const mediaResultsCount =
  document.getElementById(
    "media-results-count"
  );

const mediaFilterButtons =
  document.querySelectorAll(
    "[data-media-filter]"
  );


let adminMediaItems = [];
let activeMediaFilter = "all";


function getAdminMediaPreview(item) {
  const uploaderName =
    escapeActivityText(
      item.user_name ||
      "a family member"
    );


  if (
    item.media_type === "video"
  ) {
    if (item.video_thumbnail_url) {
      return `
        <img
          src="${escapeActivityText(
            item.video_thumbnail_url
          )}"
          alt="Video uploaded by ${uploaderName}"
          loading="lazy"
        >
      `;
    }

    return `
      <div class="admin-media-placeholder">
        <span>🎥</span>
        <p>Video</p>
      </div>
    `;
  }


  if (item.image_url) {
    return `
      <img
        src="${escapeActivityText(
          item.image_url
        )}"
        alt="Photo uploaded by ${uploaderName}"
        loading="lazy"
      >
    `;
  }


  return `
    <div class="admin-media-placeholder">
      <span>🖼️</span>
      <p>Preview unavailable</p>
    </div>
  `;
}


function formatMediaUploadDate(
  dateValue
) {
  const uploadDate =
    new Date(dateValue);


  if (
    Number.isNaN(
      uploadDate.getTime()
    )
  ) {
    return "Unknown date";
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


function getFilteredAdminMedia() {
  const searchTerm =
    String(
      mediaSearchInput?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  return adminMediaItems.filter(
    item => {
      const matchesType =
        activeMediaFilter === "all" ||
        item.media_type ===
          activeMediaFilter;


      const searchableText = [
        item.user_name,
        item.caption,
        item.original_filename
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        searchTerm.length === 0 ||
        searchableText.includes(
          searchTerm
        );


      return (
        matchesType &&
        matchesSearch
      );
    }
  );
}


function renderAdminMedia() {
  if (!adminMediaGrid) {
    return;
  }

  const filteredItems =
    getFilteredAdminMedia();

  if (mediaResultsCount) {
    mediaResultsCount.textContent =
      `${filteredItems.length} ${
        filteredItems.length === 1
          ? "item"
          : "items"
      }`;
  }

  if (filteredItems.length === 0) {
    adminMediaGrid.innerHTML = `
      <div class="media-empty">
        <span>🌿</span>

        <p>
          No matching media found.
        </p>
      </div>
    `;

    return;
  }

  adminMediaGrid.innerHTML =
    filteredItems
      .map(item => {
        const mediaId =
          String(item.id);

        const isSelected =
          selectedMediaIds.has(
            mediaId
          );

        const selectionClass =
          isSelected
            ? " selected"
            : "";

        const selectionIndicator =
          mediaSelectionMode
            ? `
              <span class="admin-media-selection-indicator">
                ${isSelected ? "✓" : ""}
              </span>
            `
            : "";

        const preview =
          getAdminMediaPreview(item);

        const uploaderName =
          escapeActivityText(
            item.user_name ||
            "Unknown member"
          );

        const typeIsVideo =
          item.media_type ===
          "video";

        const typeIcon =
          typeIsVideo
            ? "🎥"
            : "📸";

        const typeLabel =
          typeIsVideo
            ? "Video"
            : "Photo";

        const uploadDate =
          formatMediaUploadDate(
            item.created_at
          );

        const caption =
          item.caption
            ? `
              <p class="admin-media-caption">
                ${escapeActivityText(
                  item.caption
                )}
              </p>
            `
            : "";

        return `
          <article
            class="admin-media-card${selectionClass}"
            data-media-id="${escapeActivityText(
              item.id
            )}"
          >
            <div class="admin-media-preview">
              ${preview}

              ${selectionIndicator}

              <span class="admin-media-type">
                ${typeIcon}
                ${typeLabel}
              </span>
            </div>

            <div class="admin-media-information">
              <p class="admin-media-uploader">
                ${uploaderName}
              </p>

              ${caption}

              <p class="admin-media-date">
                ${uploadDate}
              </p>
            </div>
          </article>
        `;
      })
      .join("");
}
  

// ============================================================
// R2 ADMIN MEDIA URLS
// ============================================================

async function getAdminR2ReadUrls(
  objectKeys
) {
  const uniqueKeys =
    [
      ...new Set(
        objectKeys.filter(
          Boolean
        )
      )
    ];


  if (
    uniqueKeys.length === 0
  ) {
    return {};
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .functions
      .invoke(
        "r2-read",
        {
          body: {
            objectKeys:
              uniqueKeys
          }
        }
      );


  if (
    error ||
    !data?.success
  ) {
    throw new Error(
      data?.error ||
      "The admin media URLs could not be created."
    );
  }


  return data.urls || {};
}

async function loadAdminMedia() {
  if (!adminMediaGrid) {
    return;
  }


  adminMediaGrid.innerHTML = `
    <p class="media-loading">
      Loading media...
    </p>
  `;


  if (mediaResultsCount) {
    mediaResultsCount.textContent =
      "Loading media...";
  }


  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("photos")
        .select(`
          id,
          image_url,
          video_url,
          video_thumbnail_url,
          r2_object_key,
          r2_thumbnail_key,
          media_type,
          user_name,
          caption,
          original_filename,
          status,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false
          }
        );


    if (error) {
      throw error;
    }


    const mediaItems =
      data || [];


    // --------------------------------------------------------
    // CREATE TEMPORARY R2 VIEWING URLS
    // --------------------------------------------------------

    const r2Keys =
      mediaItems.flatMap(
        media => [
          media.r2_object_key,
          media.r2_thumbnail_key
        ]
      );


    const r2Urls =
      await getAdminR2ReadUrls(
        r2Keys
      );


    // --------------------------------------------------------
    // PUT TEMPORARY URLS INTO THE SAME FIELDS THE ADMIN UI
    // ALREADY KNOWS HOW TO USE
    // --------------------------------------------------------

    mediaItems.forEach(
      media => {

        if (
          media.media_type ===
          "video"
        ) {
          if (
            media.r2_object_key
          ) {
            media.video_url =
              r2Urls[
                media.r2_object_key
              ] || null;
          }


          if (
            media.r2_thumbnail_key
          ) {
            media.video_thumbnail_url =
              r2Urls[
                media.r2_thumbnail_key
              ] || null;
          }

        } else {
          if (
            media.r2_object_key
          ) {
            media.image_url =
              r2Urls[
                media.r2_object_key
              ] || null;
          }
        }
      }
    );


    adminMediaItems =
      mediaItems;


    renderAdminMedia();


  } catch (error) {
    console.error(
      "Could not load admin media:",
      error
    );


    if (
      mediaResultsCount
    ) {
      mediaResultsCount.textContent =
        "Unable to load media";
    }


    adminMediaGrid.innerHTML = `
      <div class="media-empty">
        <span>⚠️</span>

        <p>
          Media could not be loaded.
        </p>
      </div>
    `;
  }
}

function changeMediaFilter(
  event
) {
  const selectedButton =
    event.currentTarget;


  activeMediaFilter =
    selectedButton.dataset
      .mediaFilter ||
    "all";


  mediaFilterButtons.forEach(
    button => {
      button.classList.toggle(
        "active",
        button === selectedButton
      );
    }
  );


  renderAdminMedia();
}


if (mediaSearchInput) {
  mediaSearchInput.addEventListener(
    "input",
    renderAdminMedia
  );
}


mediaFilterButtons.forEach(
  button => {
    button.addEventListener(
      "click",
      changeMediaFilter
    );
  }
);

// ============================================================
// MEDIA SELECTION
// ============================================================

const startMediaSelectionButton =
  document.getElementById(
    "start-media-selection-btn"
  );

const activeMediaSelectionControls =
  document.getElementById(
    "active-media-selection-controls"
  );

const selectedMediaCount =
  document.getElementById(
    "selected-media-count"
  );

const selectAllMediaButton =
  document.getElementById(
    "select-all-media-btn"
  );

const cancelMediaSelectionButton =
  document.getElementById(
    "cancel-media-selection-btn"
  );


let mediaSelectionMode = false;

const selectedMediaIds =
  new Set();


function updateMediaSelectionControls() {
  if (startMediaSelectionButton) {
    startMediaSelectionButton.hidden =
      mediaSelectionMode;
  }

  if (activeMediaSelectionControls) {
    activeMediaSelectionControls.hidden =
      !mediaSelectionMode;
  }

  if (selectedMediaCount) {
    const count =
      selectedMediaIds.size;

    selectedMediaCount.textContent =
      `${count} selected`;
  }
  updateDeleteSelectedButton();
}


function enterMediaSelectionMode() {
  mediaSelectionMode = true;

  selectedMediaIds.clear();

  updateMediaSelectionControls();
  renderAdminMedia();
}


function exitMediaSelectionMode() {
  mediaSelectionMode = false;

  selectedMediaIds.clear();

  updateMediaSelectionControls();
  renderAdminMedia();
}


function toggleMediaSelection(
  mediaId
) {
  const normalisedId =
    String(mediaId);

  if (
    selectedMediaIds.has(
      normalisedId
    )
  ) {
    selectedMediaIds.delete(
      normalisedId
    );
  } else {
    selectedMediaIds.add(
      normalisedId
    );
  }

  updateMediaSelectionControls();
  renderAdminMedia();
}


function selectAllVisibleMedia() {
  const visibleItems =
    getFilteredAdminMedia();

  const allVisibleSelected =
    visibleItems.every(
      item =>
        selectedMediaIds.has(
          String(item.id)
        )
    );

  visibleItems.forEach(item => {
    const mediaId =
      String(item.id);

    if (allVisibleSelected) {
      selectedMediaIds.delete(
        mediaId
      );
    } else {
      selectedMediaIds.add(
        mediaId
      );
    }
  });

  updateMediaSelectionControls();
  renderAdminMedia();
}


if (startMediaSelectionButton) {
  startMediaSelectionButton.addEventListener(
    "click",
    enterMediaSelectionMode
  );
}


if (cancelMediaSelectionButton) {
  cancelMediaSelectionButton.addEventListener(
    "click",
    exitMediaSelectionMode
  );
}


if (selectAllMediaButton) {
  selectAllMediaButton.addEventListener(
    "click",
    selectAllVisibleMedia
  );
}

// ============================================================
// ADMIN MEDIA DELETE CONFIRMATION
// ============================================================

const deleteSelectedMediaButton =
  document.getElementById(
    "delete-selected-media-btn"
  );

const adminDeleteModal =
  document.getElementById(
    "admin-delete-modal"
  );

const adminDeleteTitle =
  document.getElementById(
    "admin-delete-title"
  );

const adminDeleteMessage =
  document.getElementById(
    "admin-delete-message"
  );

const cancelAdminDeleteButton =
  document.getElementById(
    "cancel-admin-delete-btn"
  );

const confirmAdminDeleteButton =
  document.getElementById(
    "confirm-admin-delete-btn"
  );


function updateDeleteSelectedButton() {
  if (!deleteSelectedMediaButton) {
    return;
  }

  const count =
    selectedMediaIds.size;

  deleteSelectedMediaButton.disabled =
    count === 0;

  deleteSelectedMediaButton.textContent =
    count === 0
      ? "🗑️ Delete"
      : `🗑️ Delete (${count})`;
}


function openAdminDeleteConfirmation() {
  const count =
    selectedMediaIds.size;

  if (
    count === 0 ||
    !adminDeleteModal
  ) {
    return;
  }

  const itemWord =
    count === 1
      ? "item"
      : "items";

  adminDeleteTitle.textContent =
    count === 1
      ? "Delete this item?"
      : `Delete ${count} items?`;

  adminDeleteMessage.textContent =
    `The selected ${itemWord} will be permanently removed from the family album. This cannot be undone.`;

  adminDeleteModal.hidden =
    false;

  document.body.classList.add(
    "admin-delete-open"
  );
}


function closeAdminDeleteConfirmation() {
  if (!adminDeleteModal) {
    return;
  }

  adminDeleteModal.hidden =
    true;

  document.body.classList.remove(
    "admin-delete-open"
  );
}


if (deleteSelectedMediaButton) {
  deleteSelectedMediaButton.addEventListener(
    "click",
    openAdminDeleteConfirmation
  );
}


if (cancelAdminDeleteButton) {
  cancelAdminDeleteButton.addEventListener(
    "click",
    closeAdminDeleteConfirmation
  );
}


document
  .querySelectorAll(
    "[data-close-admin-delete]"
  )
  .forEach(element => {
    element.addEventListener(
      "click",
      closeAdminDeleteConfirmation
    );
  });

// ============================================================
// ADMIN BULK MEDIA DELETION
// ============================================================

async function deleteSelectedAdminMedia() {
  const selectedIds =
    Array.from(
      selectedMediaIds
    );

  if (
    selectedIds.length === 0
  ) {
    return;
  }


  confirmAdminDeleteButton.disabled =
    true;

  confirmAdminDeleteButton.textContent =
    "Deleting...";


  let deletedCount = 0;
  let failedCount = 0;


  try {
    for (
      const mediaId of selectedIds
    ) {
      try {
        const {
          data,
          error
        } =
          await supabaseClient
            .functions
            .invoke(
              "delete-photo",
              {
                body: {
                  photoId:
                    mediaId,

                  userId:
                    currentAdmin.id
                }
              }
            );


        if (error) {
          throw error;
        }


        if (!data?.success) {
          throw new Error(
            data?.error ||
            "The media could not be deleted."
          );
        }


        deletedCount++;

      } catch (error) {
        failedCount++;

        console.error(
          `ADMIN DELETE ERROR FOR ${mediaId}:`,
          error
        );
      }
    }


    closeAdminDeleteConfirmation();


    /*
      Remove successfully deleted items from
      the current local list immediately.
    */

    const selectedIdSet =
      new Set(
        selectedIds
      );


    adminMediaItems =
      adminMediaItems.filter(
        item =>
          !selectedIdSet.has(
            String(item.id)
          )
      );


    /*
      Leave selection mode and clear all
      selected IDs.
    */

    mediaSelectionMode =
      false;

    selectedMediaIds.clear();

    updateMediaSelectionControls();


    /*
      Reload from Supabase so the admin view
      reflects the real database state.
    */

    await loadAdminMedia();

    await loadDashboardStatistics();

    await loadRecentActivity();

    await loadAdminR2StorageUsage();


    if (
      deletedCount > 0 &&
      failedCount === 0
    ) {
      alert(
        `${deletedCount} ${
          deletedCount === 1
            ? "item"
            : "items"
        } deleted successfully.`
      );

    } else if (
      deletedCount > 0
    ) {
      alert(
        `${deletedCount} deleted, ${failedCount} failed.`
      );

    } else {
      alert(
        "The selected media could not be deleted."
      );
    }

  } finally {
    confirmAdminDeleteButton.disabled =
      false;

    confirmAdminDeleteButton.textContent =
      "Delete permanently";
  }
}


if (confirmAdminDeleteButton) {
  confirmAdminDeleteButton.addEventListener(
    "click",
    deleteSelectedAdminMedia
  );
}

// ============================================================
// MEDIA VIEWER
// ============================================================

const adminMediaViewer =
  document.getElementById(
    "admin-media-viewer"
  );

const adminMediaViewerPreview =
  document.getElementById(
    "admin-media-viewer-preview"
  );

const adminMediaViewerDetails =
  document.getElementById(
    "admin-media-viewer-details"
  );

const closeMediaViewerButton =
  document.getElementById(
    "close-media-viewer-btn"
  );

const previousMediaButton =
  document.getElementById(
    "previous-media-btn"
  );

const nextMediaButton =
  document.getElementById(
    "next-media-btn"
  );


let currentViewerItems = [];
let currentViewerIndex = 0;


function getViewerMedia(item) {
  const uploaderName =
    escapeActivityText(
      item.user_name ||
      "a family member"
    );


  if (
    item.media_type === "video" &&
    item.video_url
  ) {
    return `
      <video
        src="${escapeActivityText(
          item.video_url
        )}"
        controls
        playsinline
        preload="metadata"
        aria-label="Video uploaded by ${uploaderName}"
      ></video>
    `;
  }


  if (item.image_url) {
    return `
      <img
        src="${escapeActivityText(
          item.image_url
        )}"
        alt="Photo uploaded by ${uploaderName}"
      >
    `;
  }


  return `
    <div class="admin-viewer-placeholder">
      <span>
        ${
          item.media_type === "video"
            ? "🎥"
            : "🖼️"
        }
      </span>

      <p>
        Media unavailable
      </p>
    </div>
  `;
}


function renderMediaViewer() {
  const item =
    currentViewerItems[
      currentViewerIndex
    ];


  if (
    !item ||
    !adminMediaViewerPreview ||
    !adminMediaViewerDetails
  ) {
    return;
  }


  adminMediaViewerPreview.innerHTML =
    getViewerMedia(item);


  const uploaderName =
    escapeActivityText(
      item.user_name ||
      "Unknown member"
    );

  const uploadDate =
    formatMediaUploadDate(
      item.created_at
    );

  const mediaType =
    item.media_type === "video"
      ? "Video"
      : "Photo";

  const caption =
    item.caption
      ? `
        <div class="admin-viewer-detail-block">
          <span>Caption</span>

          <p>
            ${escapeActivityText(
              item.caption
            )}
          </p>
        </div>
      `
      : "";


  adminMediaViewerDetails.innerHTML = `
    <div class="admin-viewer-detail-block">
      <span>Uploaded by</span>

      <p>
        ${uploaderName}
      </p>
    </div>

    <div class="admin-viewer-detail-row">
      <div class="admin-viewer-detail-block">
        <span>Type</span>

        <p>
          ${mediaType}
        </p>
      </div>

      <div class="admin-viewer-detail-block">
        <span>Uploaded</span>

        <p>
          ${uploadDate}
        </p>
      </div>
    </div>

    ${caption}
  `;


  if (previousMediaButton) {
    previousMediaButton.disabled =
      currentViewerIndex === 0;
  }

  if (nextMediaButton) {
    nextMediaButton.disabled =
      currentViewerIndex ===
      currentViewerItems.length - 1;
  }
}


function openMediaViewer(mediaId) {
  currentViewerItems =
    getFilteredAdminMedia();


  currentViewerIndex =
    currentViewerItems.findIndex(
      item =>
        String(item.id) ===
        String(mediaId)
    );


  if (currentViewerIndex < 0) {
    return;
  }


  renderMediaViewer();


  if (adminMediaViewer) {
    adminMediaViewer.hidden = false;
  }


  document.body.classList.add(
    "admin-viewer-open"
  );

  history.pushState(
  {
    adminView: "media-view",
    mediaViewerOpen: true
  },
  ""
);
  
}

function hideMediaViewerOnly() {
  if (!adminMediaViewer) {
    return;
  }

  const video =
    adminMediaViewer.querySelector(
      "video"
    );

  if (video) {
    video.pause();
  }

  adminMediaViewer.hidden = true;

  document.body.classList.remove(
    "admin-viewer-open"
  );
}

function closeMediaViewer() {
  history.back();
}

function showPreviousMedia() {
  if (currentViewerIndex <= 0) {
    return;
  }

  currentViewerIndex -= 1;

  renderMediaViewer();
}


function showNextMedia() {
  if (
    currentViewerIndex >=
    currentViewerItems.length - 1
  ) {
    return;
  }

  currentViewerIndex += 1;

  renderMediaViewer();
}


if (adminMediaGrid) {
  adminMediaGrid.addEventListener(
    "click",
    event => {
      const mediaCard =
        event.target.closest(
          ".admin-media-card"
        );

      if (!mediaCard) {
        return;
      }

      const mediaId =
        mediaCard.dataset.mediaId;

      if (mediaSelectionMode) {
        toggleMediaSelection(
          mediaId
        );

        return;
      }

      openMediaViewer(
        mediaId
      );
    }
  );
}


if (closeMediaViewerButton) {
  closeMediaViewerButton.addEventListener(
    "click",
    closeMediaViewer
  );
}


document
  .querySelectorAll(
    "[data-close-media-viewer]"
  )
  .forEach(element => {
    element.addEventListener(
      "click",
      closeMediaViewer
    );
  });


if (previousMediaButton) {
  previousMediaButton.addEventListener(
    "click",
    showPreviousMedia
  );
}


if (nextMediaButton) {
  nextMediaButton.addEventListener(
    "click",
    showNextMedia
  );
}


document.addEventListener(
  "keydown",
  event => {
    if (
      !adminMediaViewer ||
      adminMediaViewer.hidden
    ) {
      return;
    }


    if (event.key === "Escape") {
      closeMediaViewer();
    }

    if (event.key === "ArrowLeft") {
      showPreviousMedia();
    }

    if (event.key === "ArrowRight") {
      showNextMedia();
    }
  }
);


// ============================================================
// MOBILE BACK-BUTTON NAVIGATION
// ============================================================

window.addEventListener(
  "popstate",
  event => {
    if (mediaSelectionMode) {
  exitMediaSelectionMode();

  history.pushState(
    {
      adminView: "media-view"
    },
    ""
  );

  return;
    }
    /*
      If the media viewer is open,
      Back should close it first.
    */
    if (
      adminMediaViewer &&
      !adminMediaViewer.hidden
    ) {
      hideMediaViewerOnly();
      return;
    }

    const viewId =
      event.state?.adminView ||
      "dashboard-view";

    const requestedView =
      document.getElementById(
        viewId
      );

    showAdminView(
      requestedView ||
      dashboardView,
      false
    );
  }
);

// ============================================================
// DAILY UPLOAD LIMIT CONTROL
// ============================================================

const adminDailyLimitToggle =
  document.getElementById(
    "admin-daily-limit-toggle"
  );

const adminDailyLimitDescription =
  document.getElementById(
    "admin-daily-limit-description"
  );


async function loadAdminDailyLimit() {
  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("settings")
        .select("value")
        .eq(
          "key",
          "daily_upload_limit_enabled"
        )
        .single();


    if (error) {
      throw error;
    }


    const enabled =
      String(
        data.value
      ) === "true";


    if (adminDailyLimitToggle) {
      adminDailyLimitToggle.checked =
        enabled;
    }


    if (
      adminDailyLimitDescription
    ) {
      adminDailyLimitDescription.textContent =
        enabled
          ? "Maximum 10 successful uploads per person each day."
          : "Daily upload limits are currently disabled.";
    }

  } catch (error) {
    console.error(
      "DAILY LIMIT LOAD ERROR:",
      error
    );
  }
}


async function changeAdminDailyLimit() {
  if (
    !adminDailyLimitToggle ||
    !currentAdmin
  ) {
    return;
  }


  const requestedState =
    adminDailyLimitToggle.checked;


  adminDailyLimitToggle.disabled =
    true;


  try {
    const {
      error
    } =
      await supabaseClient.rpc(
        "set_daily_upload_limit_enabled",
        {
          p_user_id:
            currentAdmin.id,

          p_enabled:
            requestedState
        }
      );


    if (error) {
      throw error;
    }


    adminDailyLimitDescription.textContent =
      requestedState
        ? "Maximum 10 successful uploads per person each day."
        : "Daily upload limits are currently disabled.";

  } catch (error) {
    console.error(
      "DAILY LIMIT UPDATE ERROR:",
      error
    );


    adminDailyLimitToggle.checked =
      !requestedState;


    alert(
      "The daily upload setting could not be changed."
    );

  } finally {
    adminDailyLimitToggle.disabled =
      false;
  }
}


if (adminDailyLimitToggle) {
  adminDailyLimitToggle.addEventListener(
    "change",
    changeAdminDailyLimit
  );
}

// ============================================================
// ADMIN R2 STORAGE
// ============================================================

const adminStoragePercent =
  document.getElementById(
    "admin-storage-percent"
  );

const adminStorageFill =
  document.getElementById(
    "admin-storage-fill"
  );

const adminStorageTotal =
  document.getElementById(
    "admin-storage-total"
  );

const adminPhotoStorage =
  document.getElementById(
    "admin-photo-storage"
  );

const adminVideoStorage =
  document.getElementById(
    "admin-video-storage"
  );

const adminThumbnailStorage =
  document.getElementById(
    "admin-thumbnail-storage"
  );

const adminStorageObjects =
  document.getElementById(
    "admin-storage-objects"
  );


function formatAdminStorage(
  gb
) {
  if (
    gb < 0.01
  ) {
    return `${(
      gb * 1000
    ).toFixed(1)} MB`;
  }


  return `${gb.toFixed(2)} GB`;
}


async function loadAdminR2StorageUsage() {
  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .functions
        .invoke(
          "r2-usage",
          {
            body: {}
          }
        );


    if (
      error ||
      !data?.success
    ) {
      throw new Error(
        data?.error ||
        "Storage usage could not be loaded."
      );
    }


    const percent =
      Number(
        data.percentUsed
      ) || 0;


    if (
      adminStoragePercent
    ) {
      adminStoragePercent.textContent =
        `${percent.toFixed(1)}%`;
    }


    if (
      adminStorageFill
    ) {
      adminStorageFill.style.width =
        `${Math.min(
          percent,
          100
        )}%`;
    }


    if (
      adminStorageTotal
    ) {
      adminStorageTotal.textContent =
        `${formatAdminStorage(
          Number(
            data.totalGB
          ) || 0
        )} of 10 GB used`;
    }


    if (
      adminPhotoStorage
    ) {
      adminPhotoStorage.textContent =
        formatAdminStorage(
          Number(
            data.photoGB
          ) || 0
        );
    }


    if (
      adminVideoStorage
    ) {
      adminVideoStorage.textContent =
        formatAdminStorage(
          Number(
            data.videoGB
          ) || 0
        );
    }


    if (
      adminThumbnailStorage
    ) {
      adminThumbnailStorage.textContent =
        formatAdminStorage(
          Number(
            data.thumbnailGB
          ) || 0
        );
    }


    if (
      adminStorageObjects
    ) {
      adminStorageObjects.textContent =
        String(
          data.totalObjects || 0
        );
    }

  } catch (error) {
    console.error(
      "ADMIN R2 STORAGE ERROR:",
      error
    );


    if (
      adminStorageTotal
    ) {
      adminStorageTotal.textContent =
        "Storage usage unavailable";
    }
  }
}

// ============================================================
// START ADMIN PAGE
// ============================================================

initialiseAdminPage();
