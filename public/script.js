document.getElementById('startBtn').addEventListener('click', async () => {
    const con = document.getElementById('console');
    con.innerText = "Launching Browser...";
    
    const res = await fetch('/create-account');
    const data = await res.json();
    
    if (data.success) {
        con.innerText = `Success! Code: ${data.code}`;
    } else {
        con.innerText = `Error: ${data.error}`;
    }
});

