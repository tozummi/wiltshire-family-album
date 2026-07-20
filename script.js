const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const CLOUDINARY_CLOUD_NAME = "x58975lj";
const CLOUDINARY_UPLOAD_PRESET = "family_album_upload";

let selectedMember = null;
let currentUser = null;

function getTextColour(hex) {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150 ? "#000000" : "#ffffff";
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

  const list = document.getElementById("family-list");

  list.innerHTML = "";

  data.forEach(member => {
    const button = document.createElement("button");

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
        .forEach(btn => btn.classList.remove("selected"));

      button.classList.add("selected");

      document.getElementById("continue-btn").disabled = false;
    };

    list.appendChild(button);
  });
}

function continueToAlbum() {
  if (!selectedMember) return;

  currentUser = selectedMember;

  document.getElementById("name-selection").style.display = "none";
  document.getElementById("album").style.display = "block";

  document.getElementById("welcome-message").textContent =
    `Welcome, ${currentUser.name} 📸`;

  console.log("Current user:", currentUser);

  loadGallery();
}

document.getElementById("continue-btn").onclick = continueToAlbum;

async function checkPin() {
  const enteredPin = document.getElementById("pin").value;

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
    document.getElementById("login-box").style.display = "none";
    document.getElementById("name-selection").style.display = "block";

    loadFamilyMembers();
  } else {
    alert("Incorrect family code");
  }
}

function togglePin() {
  const pinInput = document.getElementById("pin");

  if (pinInput.type === "password") {
    pinInput.type = "text";
  } else {
    pinInput.type = "password";
  }
}

const uploadButton = document.getElementById("upload-btn");
const photoInput = document.getElementById("photo-input");

uploadButton.onclick = () => {
  if (!uploadButton.disabled) {
    photoInput.click();
  }
};

photoInput.onchange = async event => {
  const file = event.target.files[0];

  if (!file) return;

  uploadButton.disabled = true;
  uploadButton.textContent = "⏳ Uploading your memory...";

  console.log("Uploading:", file.name);

  try {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const cloudinaryData = await response.json();

    console.log("Cloudinary result:", cloudinaryData);

    if (!cloudinaryData.secure_url) {
      throw new Error(
        cloudinaryData.error?.message ||
        "The photo could not be uploaded."
      );
    }

    const { data: newPhoto, error } = await supabaseClient
      .from("photos")
      .insert({
        image_url: cloudinaryData.secure_url,
        cloudinary_id: cloudinaryData.public_id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        status: "approved"
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    event.target.value = "";

    await loadGallery(newPhoto.id);

    alert("Photo uploaded successfully!");
  } catch (error) {
    console.log("UPLOAD ERROR:", error);

    alert(
      error.message ||
      "Something went wrong while uploading."
    );
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload Photo 📸";
  }
};

async function loadGallery(newPhotoId = null) {
  const { data, error } = await supabaseClient
    .from("photos")
    .select(`
      id,
      image_url,
      user_id,
      user_name,
      status,
      created_at,
      cloudinary_id,
      uploader:family_members (
        name,
        initials,
        colour
      )
    `)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    alert(error.message);
    return;
  }

  const gallery = document.getElementById("gallery");

  gallery.innerHTML = "";

  data.forEach(photo => {
    const uploader = photo.uploader;

    const uploaderName = uploader?.name || photo.user_name;
    const uploaderInitials = uploader?.initials || "?";
    const uploaderColour = uploader?.colour || "#777777";

    const card = document.createElement("div");

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
            color: ${getTextColour(uploaderColour)};
            font-size: 13px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          "
        >
          ${uploaderInitials}
        </span>
      </div>

      <p>📸 ${uploaderName}</p>

      <small>
        ${new Date(photo.created_at).toLocaleDateString("en-GB")}
      </small>
    `;

    card.onclick = () => {
      const viewerImage =
        document.getElementById("viewer-image");

      viewerImage.src = photo.image_url;
      viewer.hidden = false;
      viewer.classList.add("open");

      history.pushState({ photoViewer: true }, "");
    };

    gallery.appendChild(card);
  });

  if (newPhotoId) {
    requestAnimationFrame(() => {
      const newPhotoCard = gallery.querySelector(
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

const viewer = document.getElementById("photo-viewer");

function closeViewer() {
  viewer.classList.remove("open");
  viewer.hidden = true;
}

document.getElementById("close-viewer").onclick = closeViewer;

viewer.onclick = event => {
  if (event.target === viewer) {
    closeViewer();
  }
};

window.addEventListener("popstate", () => {
  if (!viewer.hidden) {
    closeViewer();
  }
});
