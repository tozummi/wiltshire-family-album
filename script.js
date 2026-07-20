const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

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

  console.log("Current user:", currentUser);
}

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
