function openModal(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add("is-open");
  }
}

function closeModal(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove("is-open");
  }
}

function hb_jump(url) {
  if (!url) return;
  window.location.href = url;
}

async function sharePost(id) {
  const response = await fetch(`/plugin.php?id=xigua_hb&ac=incr&incr_type=shares&pubid=${id}`, {
    method: "POST"
  });
  if (response.ok) {
    const shares = document.getElementById("shares");
    if (shares) {
      shares.textContent = String(Number(shares.textContent || "0") + 1);
    }
    window.alert("分享次数已增加");
  }
}

async function likePost(id) {
  const response = await fetch(`/plugin.php?id=xigua_hb&ac=praise&pubid=${id}`, {
    method: "POST"
  });
  if (response.ok) {
    const likes = document.getElementById("likes");
    if (likes) {
      likes.textContent = String(Number(likes.textContent || "0") + 1);
    }
  }
}

async function toggleStatus(id, restore) {
  const url = `/plugin.php?id=xigua_hb&ac=wc&pubid=${id}${restore ? "&huifu=1" : ""}`;
  const response = await fetch(url);
  if (response.ok) {
    window.location.reload();
  }
}

document.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal")) {
    event.target.classList.remove("is-open");
  }
});

function initNewsSlider() {
  const slider = document.getElementById("newsSlider");
  if (!slider) return;

  const track = slider.querySelector(".toutiao-track");
  const items = Array.from(slider.querySelectorAll(".toutiao-item"));
  if (!track || items.length <= 1) return;

  const itemHeight = items[0].offsetHeight || 42;
  const firstClone = items[0].cloneNode(true);
  track.appendChild(firstClone);

  let index = 0;
  window.setInterval(() => {
    index += 1;
    track.style.transition = "transform .45s ease";
    track.style.transform = `translateY(-${index * itemHeight}px)`;

    if (index === items.length) {
      window.setTimeout(() => {
        track.style.transition = "none";
        track.style.transform = "translateY(0)";
        index = 0;
      }, 520);
    }
  }, 2800);
}

document.addEventListener("DOMContentLoaded", initNewsSlider);
