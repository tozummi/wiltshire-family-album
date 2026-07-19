function checkPin() {

  const pin = document.getElementById("pin").value;

  if (pin === "WILTSHIRE26") {

    document.getElementById("login-box").style.display = "none";
    document.getElementById("album").style.display = "block";

  } else {

    alert("Incorrect family code");

  }

}
