const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

async function checkPin() {

  const enteredPin = document.getElementById("pin").value;

  const { data, error } = await supabaseClient
    .from("settings")
    .select("value")
    .eq("key", "album_pin")
    .single();

  if (error) {
    console.log(error);
    alert("Something went wrong");
    return;
  }

  if (enteredPin === data.value) {

    document.getElementById("login-box").style.display = "none";
    document.getElementById("album").style.display = "block";

  } else {

    alert("Incorrect family code");

  }

}
