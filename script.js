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
    console.log(error);
    alert(error.message);
    return;
  }

  const list = document.getElementById("family-list");

  data.forEach(member => {
    const button = document.createElement("button");

    button.className = "member-button";

    button.innerHTML = `
      <span class="avatar" style="background:${member.colour}; color:${getTextColour(member.colour)}">
  ${member.initials}
</span>
      <span>${member.name}</span>
    `;

    button.onclick = () => {
      selectedMember = member;

      document.querySelectorAll(".member-button")
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
document.getElementById("upload-btn").onclick = () => {
  document.getElementById("photo-input").click();
};
document.getElementById("photo-input").onchange = async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  console.log("Uploading:", file.name);

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

  const data = await response.json();

console.log("Cloudinary result:", data);

if (data.secure_url) {

  const { error } = await supabaseClient
    .from("photos")
    .insert({
      image_url: data.secure_url,
      cloudinary_id: data.public_id,
      user_id: currentUser.id,
      user_name: currentUser.name,
      status: "approved"
    });

  if (error) {
    console.log(error);
    alert(error.message);
    return;
  }

  alert("Photo uploaded successfully!");
}
