const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CLOUDINARY_CLOUD_NAME = "x58975lj";
const CLOUDINARY_UPLOAD_PRESET = "family_album_upload";

let currentUserReaction = null;
let currentPhotoId = null;
let currentPhotoUploaderId = null;
let currentPhotoCaption = "";
let selectedMember = null;
let currentUser = null;

const savedUser = localStorage.getItem("familyAlbumUser");

const gallery = document.getElementById("gallery");
const viewer = document.getElementById("photo-viewer");

const uploadButton = document.getElementById("upload-btn");
const photoInput = document.getElementById("photo-input");

const editCaptionButton =
  document.getElementById("edit-caption-btn");

const captionEditor =
  document.getElementById("caption-editor");

const captionInput =
  document.getElementById("caption-input");

const cancelCaptionButton =
  document.getElementById("cancel-caption-btn");

const saveCaptionButton =
  document.getElementById("save-caption-btn");

const reactionButtons =
  document.querySelectorAll("#reaction-bar button");


function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.className = "";
  toast.classList.add(type, "show");

  clearTimeout(toast.hideTimer);

  toast.hideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


function getTextColour(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);

  const brightness =
    (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150
    ? "#000000"
    : "#ffffff";
}


async function loadFamilyMembers() {
  const { data, error } = await supabaseClient
    .from("family_members")
    .select("id, name, initials, colour")
    .order("name");

  if (error) {
    console.log("SUPABASE ERROR:", error);
    alert("SUPABASE ERROR: " + error.message);
    return;
  }

  const list =
    document.getElementById("family-list");

  list.innerHTML = "";

  data.forEach(member => {
    const button =
      document.createElement("button");

    button.className = "member-button";

    button.innerHTML = `
      <span
        class="avatar"
        style="
          background: ${member.colour};
          color: ${getTextColour(member.colour)};
        "
      >
        ${member.initials}
      </span>

      <span>${member.name}</span>
    `;

    button.onclick = () => {
      selectedMember = member;

      document
        .querySelectorAll(".member-button")
        .forEach(memberButton => {
          memberButton.classList.remove("selected");
        });

      button.classList.add("selected");

      document.getElementById(
        "continue-btn"
      ).disabled = false;
    };

    list.appendChild(button);
  });
}


function continueToAlbum() {
  if (!selectedMember) return;

  currentUser = selectedMember;

  localStorage.setItem(
    "familyAlbumUser",
    JSON.stringify(currentUser)
  );

  document.getElementById(
    "name-selection"
  ).style.display = "none";

  document.getElementById(
    "album"
  ).style.display = "block";

  document.getElementById(
    "welcome-message"
  ).textContent =
    `Welcome, ${currentUser.name} 📸`;

  loadGallery();
}


function restoreSavedUser() {
  if (!savedUser) return;

  try {
    currentUser = JSON.parse(savedUser);
    selectedMember = currentUser;

    document.getElementById(
      "login-box"
    ).style.display = "none";

    document.getElementById(
      "name-selection"
    ).style.display = "none";

    document.getElementById(
      "album"
    ).style.display = "block";

    document.getElementById(
      "welcome-message"
    ).textContent =
      `Welcome, ${currentUser.name} 📸`;

    loadGallery();
  } catch (error) {
    localStorage.removeItem("familyAlbumUser");

    console.log(
      "Could not restore saved user:",
      error
    );
  }
}


document.getElementById(
  "continue-btn"
).onclick = continueToAlbum;


async function checkPin() {
  const enteredPin =
    document.getElementById("pin").value;

  gallery.innerHTML = `
    <p class="gallery-message">
      Loading memories... 📸
    </p>
  `;

  const { data, error } = await supabaseClient
    .from("settings")
    .select("value")
    .eq("key", "album_pin")
    .single();

  if (error) {
    console.log(error);
    alert(error.message);
    return;
  }

  if (enteredPin === data.value) {
    document.getElementById(
      "login-box"
    ).style.display = "none";

    document.getElementById(
      "name-selection"
    ).style.display = "block";

    loadFamilyMembers();
  } else {
    alert("Incorrect family code");
  }
}


function togglePin() {
  const pinInput =
    document.getElementById("pin");

  pinInput.type =
    pinInput.type === "password"
      ? "text"
      : "password";
}


uploadButton.onclick = () => {
  if (!uploadButton.disabled) {
    photoInput.click();
  }
};


photoInput.onchange = async event => {
  const files =
    Array.from(event.target.files);

  if (files.length === 0) return;

  uploadButton.disabled = true;

  let uploadedCount = 0;
  let failedCount = 0;
  let newestPhotoId = null;

  try {
    for (
      let index = 0;
      index < files.length;
      index++
    ) {
      const file = files[index];

      uploadButton.textContent =
        `⏳ Uploading ${index + 1} of ${files.length}...`;

      try {
        const formData = new FormData();

        formData.append("file", file);

        formData.append(
          "upload_preset",
          CLOUDINARY_UPLOAD_PRESET
        );

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData
          }
        );

        const cloudinaryData =
          await response.json();

        if (!cloudinaryData.secure_url) {
          throw new Error(
            cloudinaryData.error?.message ||
            "The photo could not be uploaded."
          );
        }

        const {
          data: newPhoto,
          error
        } = await supabaseClient
          .from("photos")
          .insert({
            image_url:
              cloudinaryData.secure_url,

            cloudinary_id:
              cloudinaryData.public_id,

            user_id:
              currentUser.id,

            user_name:
              currentUser.name,

            status:
              "approved"
          })
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        uploadedCount++;
        newestPhotoId = newPhoto.id;
      } catch (error) {
        failedCount++;

        console.log(
          `UPLOAD ERROR FOR ${file.name}:`,
          error
        );
      }
    }

    event.target.value = "";

    await loadGallery(newestPhotoId);

    if (
      uploadedCount > 0 &&
      failedCount === 0
    ) {
      showToast(
        `${uploadedCount} photo${
          uploadedCount === 1 ? "" : "s"
        } uploaded successfully! 📸`
      );
    } else if (uploadedCount > 0) {
      showToast(
        `${uploadedCount} uploaded, ${failedCount} failed.`,
        "error"
      );
    } else {
      showToast(
        "None of the photos could be uploaded.",
        "error"
      );
    }
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent =
      "Upload Photos 📸";
  }
};


async function loadGallery(
  newPhotoId = null
) {
  const { data, error } =
    await supabaseClient
      .from("photos")
      .select(`
        id,
        image_url,
        user_id,
        user_name,
        status,
        created_at,
        caption,
        cloudinary_id,
        uploader:family_members (
          name,
          initials,
          colour
        )
      `)
      .eq("status", "approved")
      .order(
        "created_at",
        { ascending: false }
      );

  if (error) {
    console.log(error);
    alert(error.message);
    return;
  }

  gallery.innerHTML = "";

  if (data.length === 0) {
    gallery.innerHTML = `
      <p class="gallery-message">
        No memories have been added yet 📸
      </p>
    `;

    return;
  }

  data.forEach(photo => {
    const uploader = photo.uploader;

    const uploaderName =
      uploader?.name ||
      photo.user_name;

    const uploaderInitials =
      uploader?.initials ||
      "?";

    const uploaderColour =
      uploader?.colour ||
      "#777777";

    const card =
      document.createElement("div");

    card.className = "photo-card";
    card.dataset.photoId = photo.id;

    card.innerHTML = `
      <div
        class="photo-image-wrapper"
        style="
          position: relative;
          width: 100%;
        "
      >
        <img
          src="${photo.image_url}"
          alt="Photo uploaded by ${uploaderName}"
        >

        <span
          class="photo-uploader-badge"
          title="${uploaderName}"
          style="
            position: absolute;
            right: 10px;
            bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border: 2px solid white;
            border-radius: 50%;
            background: ${uploaderColour};
            color: ${getTextColour(
              uploaderColour
            )};
            font-size: 13px;
            font-weight: bold;
            box-shadow:
              0 2px 8px
              rgba(0, 0, 0, 0.25);
          "
        >
          ${uploaderInitials}
        </span>
      </div>

      <p>📸 ${uploaderName}</p>

      <small>
        ${new Date(
          photo.created_at
        ).toLocaleDateString("en-GB")}
      </small>
    `;

    card.onclick = () => {
      const viewerImage =
        document.getElementById(
          "viewer-image"
        );

      const viewerUploader =
        document.getElementById(
          "viewer-uploader"
        );

      const viewerDate =
        document.getElementById(
          "viewer-date"
        );

      const viewerCaption =
        document.getElementById(
          "viewer-caption"
        );

      viewerImage.src =
        photo.image_url;

      viewerCaption.textContent =
        photo.caption || "";

      currentPhotoId =
        photo.id;

      currentPhotoUploaderId =
        photo.user_id;

      currentPhotoCaption =
        photo.caption || "";

      editCaptionButton.hidden =
        photo.user_id !==
        currentUser.id;

      editCaptionButton.textContent =
        currentPhotoCaption
          ? "Edit caption"
          : "Add caption";

      viewerUploader.textContent =
        `📸 ${uploaderName}`;

      viewerDate.textContent =
        new Date(
          photo.created_at
        ).toLocaleDateString("en-GB");

      viewer.hidden = false;
      viewer.classList.add("open");

      loadCurrentReaction();

      history.pushState(
        { photoViewer: true },
        ""
      );
    };

    gallery.appendChild(card);
  });

  if (newPhotoId) {
    requestAnimationFrame(() => {
      const newPhotoCard =
        gallery.querySelector(
          `[data-photo-id="${newPhotoId}"]`
        );

      if (newPhotoCard) {
        newPhotoCard.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });
  }
}


function closeViewer() {
  viewer.classList.remove("open");

  captionEditor.hidden = true;

  editCaptionButton.hidden =
    currentPhotoUploaderId !==
    currentUser.id;

  viewer.hidden = true;

  currentPhotoId = null;
  currentPhotoUploaderId = null;
  currentPhotoCaption = "";
  currentUserReaction = null;

  reactionButtons.forEach(button => {
    button.classList.remove("selected");
  });
}


document.getElementById(
  "close-viewer"
).onclick = closeViewer;


viewer.onclick = event => {
  if (event.target === viewer) {
    closeViewer();
  }
};


window.addEventListener(
  "popstate",
  () => {
    if (!viewer.hidden) {
      closeViewer();
    }
  }
);


editCaptionButton.onclick = () => {
  captionInput.value =
    currentPhotoCaption;

  captionEditor.hidden = false;
  editCaptionButton.hidden = true;

  captionInput.focus();
};


cancelCaptionButton.onclick = () => {
  captionEditor.hidden = true;

  editCaptionButton.hidden =
    currentPhotoUploaderId !==
    currentUser.id;
};


saveCaptionButton.onclick = async () => {
  const newCaption =
    captionInput.value.trim();

  saveCaptionButton.disabled = true;
  saveCaptionButton.textContent =
    "Saving...";

  const {
    data: updatedPhoto,
    error
  } = await supabaseClient
    .from("photos")
    .update({
      caption: newCaption || null
    })
    .eq(
      "id",
      currentPhotoId
    )
    .eq(
      "user_id",
      currentUser.id
    )
    .select("caption")
    .single();

  saveCaptionButton.disabled = false;
  saveCaptionButton.textContent =
    "Save";

  if (error || !updatedPhoto) {
    console.log(
      "CAPTION ERROR:",
      error
    );

    showToast(
      "The caption could not be saved.",
      "error"
    );

    return;
  }

  currentPhotoCaption =
    newCaption;

  document.getElementById(
    "viewer-caption"
  ).textContent =
    currentPhotoCaption;

  editCaptionButton.textContent =
    currentPhotoCaption
      ? "Edit caption"
      : "Add caption";

  captionEditor.hidden = true;
  editCaptionButton.hidden = false;

  showToast("Caption saved ✏️");

  await loadGallery();
};


async function loadCurrentReaction() {
  reactionButtons.forEach(button => {
    button.classList.remove("selected");

    const countElement =
      button.querySelector(".reaction-count");

    if (countElement) {
      countElement.textContent = "0";
    }
  });

  currentUserReaction = null;

  if (!currentPhotoId || !currentUser) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("photo_reactions")
    .select("user_id, reaction")
    .eq("photo_id", currentPhotoId);

  if (error) {
    console.log(
      "REACTION LOAD ERROR:",
      error
    );

    showToast(
      "The reactions could not be loaded.",
      "error"
    );

    return;
  }

  const reactionCounts = {
    love: 0,
    funny: 0,
    beautiful: 0,
    aww: 0,
    like: 0
  };

  data.forEach(savedReaction => {
    if (
      Object.prototype.hasOwnProperty.call(
        reactionCounts,
        savedReaction.reaction
      )
    ) {
      reactionCounts[savedReaction.reaction]++;
    }

    if (
      String(savedReaction.user_id) ===
      String(currentUser.id)
    ) {
      currentUserReaction =
        savedReaction.reaction;
    }
  });

  reactionButtons.forEach(button => {
    const reaction =
      button.dataset.reaction;

    const countElement =
      button.querySelector(".reaction-count");

    if (countElement) {
      const count =
        reactionCounts[reaction] || 0;

      countElement.textContent =
        count > 0 ? count : "";
    }

    if (
      reaction ===
      currentUserReaction
    ) {
      button.classList.add("selected");
    }
  });
}


reactionButtons.forEach(button => {
  button.onclick = async () => {
    if (
      !currentPhotoId ||
      !currentUser
    ) {
      return;
    }

    const chosenReaction =
      button.dataset.reaction;

    reactionButtons.forEach(
      reactionButton => {
        reactionButton.disabled = true;
      }
    );

    if (
      currentUserReaction ===
      chosenReaction
    ) {
      const { error } =
        await supabaseClient
          .from("photo_reactions")
          .delete()
          .eq(
            "photo_id",
            currentPhotoId
          )
          .eq(
            "user_id",
            currentUser.id
          );

      reactionButtons.forEach(
        reactionButton => {
          reactionButton.disabled = false;
        }
      );

      if (error) {
        console.log(
          "REACTION DELETE ERROR:",
          error
        );

        showToast(
          "The reaction could not be removed.",
          "error"
        );

        return;
      }

      currentUserReaction = null;

      reactionButtons.forEach(
        reactionButton => {
          reactionButton.classList.remove(
            "selected"
          );
        }
      );

      return;
    }

    const { error } =
      await supabaseClient
        .from("photo_reactions")
        .upsert(
          {
            photo_id:
              currentPhotoId,

            user_id:
              currentUser.id,

            reaction:
              chosenReaction
          },
          {
            onConflict:
              "photo_id,user_id"
          }
        );

    reactionButtons.forEach(
      reactionButton => {
        reactionButton.disabled = false;
      }
    );

    if (error) {
      console.log(
        "REACTION SAVE ERROR:",
        error
      );

      showToast(
        "The reaction could not be saved.",
        "error"
      );

      return;
    }

    currentUserReaction =
      chosenReaction;

    reactionButtons.forEach(
      reactionButton => {
        reactionButton.classList.remove(
          "selected"
        );
      }
    );

    button.classList.add(
      "selected"
    );
  };
});


restoreSavedUser();
