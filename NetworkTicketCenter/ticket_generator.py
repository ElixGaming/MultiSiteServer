import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime


# ============================================================
# CONFIGURATION
# ============================================================

APP_NAME = "Network Ticket Center"
VERSION = "4.0"

BG = "#eef1f5"
CARD = "#ffffff"
TEXT = "#17202a"
MUTED = "#6b7280"
BORDER = "#d7dce2"

BLUE = "#2563eb"
GREEN = "#16a34a"
ORANGE = "#d97706"
RED = "#dc2626"


# ============================================================
# ÉTAT DU PROGRAMME
# ============================================================

ticket_number = 1
current_ticket = None
current_status = "OPEN"


# ============================================================
# UTILITAIRES
# ============================================================

def timestamp():
    return datetime.now().strftime("%d/%m/%Y %H:%M")


def ticket_id():
    return f"#{ticket_number:03d}"


def set_message(message):
    status_label.config(text=message)


# ============================================================
# REASON BUILDER
# ============================================================

reason_entries = {}


def clear_reason_fields():
    for widget in reason_fields.winfo_children():
        widget.destroy()

    reason_entries.clear()


def add_reason_field(label, key):
    ttk.Label(
        reason_fields,
        text=label
    ).pack(
        anchor="w",
        pady=(5, 2)
    )

    entry = ttk.Entry(reason_fields)

    entry.pack(
        fill="x"
    )

    reason_entries[key] = entry


def update_reason_fields(event=None):
    clear_reason_fields()

    selected = reason_type.get()

    if selected == "Performance":
        add_reason_field("Download (Mbps)", "download")
        add_reason_field("Upload (Mbps)", "upload")
        add_reason_field("Ping (ms)", "ping")

    elif selected == "High Ping":
        add_reason_field("Ping (ms)", "ping")

    elif selected == "Connection Unstable":
        add_reason_field("Ping (ms)", "ping")

    elif selected == "Packet Loss":
        add_reason_field("Packet Loss (%)", "loss")

    elif selected == "Custom":
        add_reason_field("Custom Reason", "custom")


def generate_reason():
    selected = reason_type.get()

    if not selected:
        set_message("⚠ Select a reason type.")
        return

    if selected == "Not Responding":
        result = "Not Responding"

    elif selected == "Performance":
        download = reason_entries["download"].get().strip()
        upload = reason_entries["upload"].get().strip()
        ping = reason_entries["ping"].get().strip()

        if not download or not upload or not ping:
            set_message("⚠ Complete Download, Upload and Ping.")
            return

        result = (
            f"Performance was ↓ {download} Mbps "
            f"↑ {upload} Mbps Ping: {ping} ms"
        )

    elif selected == "High Ping":
        ping = reason_entries["ping"].get().strip()

        if not ping:
            set_message("⚠ Enter the Ping.")
            return

        result = f"High Ping: {ping} ms"

    elif selected == "Connection Unstable":
        ping = reason_entries["ping"].get().strip()

        if not ping:
            set_message("⚠ Enter the Ping.")
            return

        result = f"Connection unstable — Ping: {ping} ms"

    elif selected == "Packet Loss":
        loss = reason_entries["loss"].get().strip()

        if not loss:
            set_message("⚠ Enter Packet Loss.")
            return

        result = f"Packet Loss: {loss}%"

    elif selected == "Wi-Fi Disconnects":
        result = "Wi-Fi disconnects randomly"

    elif selected == "DNS Error":
        result = "DNS Error"

    elif selected == "No Internet":
        result = "No Internet Connection"

    elif selected == "Custom":
        result = reason_entries["custom"].get().strip()

        if not result:
            set_message("⚠ Enter a custom reason.")
            return

    else:
        return

    reason_entry.delete(0, "end")
    reason_entry.insert(0, result)

    set_message("✓ Reason inserted into ticket")


# ============================================================
# CRÉER LE TICKET
# ============================================================

def create_ticket():
    global current_ticket, current_status

    name = name_entry.get().strip()
    location = location_entry.get().strip()
    device = device_entry.get().strip()
    reason = reason_entry.get().strip()
    ping = ping_entry.get().strip()
    description = description_box.get("1.0", "end").strip()

    if not name:
        set_message("⚠ Name is required.")
        name_entry.focus()
        return

    if not location:
        set_message("⚠ Location is required.")
        location_entry.focus()
        return

    if not reason:
        set_message("⚠ Reason is required.")
        reason_entry.focus()
        return

    current_ticket = {
        "name": name,
        "location": location,
        "device": device or "Not specified",
        "reason": reason,
        "ping": ping or "Nobody",
        "description": description,
        "created": timestamp()
    }

    current_status = "OPEN"

    display_full_ticket()
    update_interface()

    set_message(
        f"✓ Ticket {ticket_id()} created"
    )


# ============================================================
# AFFICHAGE TICKET
# ============================================================

def display_full_ticket(extra=None):
    if current_ticket is None:
        return

    text = (
        f"🎫 NETWORK TICKET {ticket_id()}\n\n"
        f"From: {current_ticket['name']}\n"
        f"Location: {current_ticket['location']}\n"
        f"Device: {current_ticket['device']}\n"
        f"Reason: {current_ticket['reason']}\n"
        f"Ping: @{current_ticket['ping']}\n"
    )

    if current_ticket["description"]:
        text += (
            "\nDescription:\n"
            f"{current_ticket['description']}\n"
        )

    text += (
        f"\nCreated: {current_ticket['created']}\n"
        f"Status: {current_status}"
    )

    if extra:
        text += f"\n\n{extra}"

    show_output(text)


def show_output(text):
    output_box.delete("1.0", "end")
    output_box.insert("1.0", text)
    update_character_count()


# ============================================================
# PASS TO TESTING
# ============================================================

def pass_to_testing():
    global current_status

    if current_ticket is None:
        set_message("⚠ Create a ticket first.")
        return

    current_status = "TESTING"

    text = (
        f"🎫 NETWORK TICKET {ticket_id()}\n\n"
        "Status passed to testing"
    )

    show_output(text)
    update_interface()

    set_message(
        f"🧪 Ticket {ticket_id()} passed to testing"
    )


# ============================================================
# PERSIST
# ============================================================

def persist_ticket():
    global current_status

    if current_ticket is None:
        set_message("⚠ Create a ticket first.")
        return

    open_persist_window()


def open_persist_window():
    window = tk.Toplevel(root)

    window.title("Persist — New Measurements")
    window.geometry("500x500")
    window.resizable(False, False)
    window.configure(bg=BG)

    # Header
    header = tk.Frame(
        window,
        bg=BG
    )

    header.pack(
        fill="x",
        padx=25,
        pady=(20, 10)
    )

    tk.Label(
        header,
        text="⚠ PERSIST",
        bg=BG,
        fg=ORANGE,
        font=("Segoe UI", 18, "bold")
    ).pack(anchor="w")

    tk.Label(
        header,
        text="Issue still present after repair",
        bg=BG,
        fg=MUTED,
        font=("Segoe UI", 10)
    ).pack(anchor="w")

    # Card
    card = tk.Frame(
        window,
        bg=CARD,
        highlightbackground=BORDER,
        highlightthickness=1
    )

    card.pack(
        fill="both",
        expand=True,
        padx=25,
        pady=10
    )

    inner = tk.Frame(
        card,
        bg=CARD
    )

    inner.pack(
        fill="both",
        expand=True,
        padx=20,
        pady=20
    )

    def field(label):
        tk.Label(
            inner,
            text=label,
            bg=CARD,
            fg=TEXT,
            font=("Segoe UI", 10)
        ).pack(
            anchor="w",
            pady=(8, 3)
        )

        entry = ttk.Entry(inner)
        entry.pack(fill="x")

        return entry

    download_entry = field("New Download (Mbps)")
    upload_entry = field("New Upload (Mbps)")
    ping_entry = field("New Ping (ms)")

    tk.Label(
        inner,
        text="Note",
        bg=CARD,
        fg=TEXT,
        font=("Segoe UI", 10)
    ).pack(
        anchor="w",
        pady=(12, 3)
    )

    note_box = tk.Text(
        inner,
        height=5,
        font=("Segoe UI", 10),
        wrap="word",
        relief="solid",
        borderwidth=1
    )

    note_box.pack(fill="x")

    def confirm_persist():
        global current_status

        download = download_entry.get().strip()
        upload = upload_entry.get().strip()
        ping = ping_entry.get().strip()
        note = note_box.get("1.0", "end").strip()

        if not download or not upload or not ping:
            messagebox.showwarning(
                "Missing data",
                "Enter Download, Upload and Ping.",
                parent=window
            )
            return

        current_status = "PERSIST"

        text = (
            f"🎫 NETWORK TICKET {ticket_id()}\n\n"
            "Status: PERSIST\n\n"
            "New Performance:\n"
            f"↓ {download} Mbps ↑ {upload} Mbps\n"
            f"Ping: {ping} ms"
        )

        if note:
            text += (
                "\n\nNote:\n"
                f"{note}"
            )

        show_output(text)
        update_interface()

        set_message(
            f"⚠ Ticket {ticket_id()} marked as PERSIST"
        )

        window.destroy()

    # Buttons
    button_frame = tk.Frame(
        window,
        bg=BG
    )

    button_frame.pack(
        fill="x",
        padx=25,
        pady=(5, 20)
    )

    ttk.Button(
        button_frame,
        text="Cancel",
        command=window.destroy
    ).pack(
        side="right",
        padx=(8, 0)
    )

    ttk.Button(
        button_frame,
        text="⚠ Confirm Persist",
        command=confirm_persist
    ).pack(
        side="right"
    )

    download_entry.focus()


# ============================================================
# CLOSE
# ============================================================

def close_ticket():
    global current_status

    if current_ticket is None:
        set_message("⚠ No active ticket.")
        return

    if current_status == "CLOSED":
        set_message("Ticket is already closed.")
        return

    confirm = messagebox.askyesno(
        "Close Ticket",
        f"Close ticket {ticket_id()}?\n\n"
        "Use this when the problem is resolved."
    )

    if not confirm:
        return

    current_status = "CLOSED"

    text = (
        f"🎫 NETWORK TICKET {ticket_id()}\n\n"
        "Status: CLOSED"
    )

    show_output(text)
    update_interface()

    set_message(
        f"✓ Ticket {ticket_id()} closed"
    )


# ============================================================
# REOPEN
# ============================================================

def reopen_ticket():
    global current_status

    if current_ticket is None:
        set_message("⚠ No active ticket.")
        return

    current_status = "OPEN"

    display_full_ticket(
        f"Ticket {ticket_id()} reopened."
    )

    update_interface()

    set_message(
        f"↻ Ticket {ticket_id()} reopened"
    )


# ============================================================
# COPIER
# ============================================================

def copy_output():
    text = output_box.get(
        "1.0",
        "end"
    ).strip()

    if not text:
        set_message("⚠ Nothing to copy.")
        return

    root.clipboard_clear()
    root.clipboard_append(text)
    root.update()

    set_message(
        "✓ Copied — ready for WhatsApp"
    )


# ============================================================
# NOUVEAU TICKET
# ============================================================

def new_ticket():
    global ticket_number
    global current_ticket
    global current_status

    if current_ticket is not None:
        ticket_number += 1

    current_ticket = None
    current_status = "OPEN"

    for entry in (
        name_entry,
        location_entry,
        device_entry,
        reason_entry,
        ping_entry
    ):
        entry.delete(0, "end")

    description_box.delete(
        "1.0",
        "end"
    )

    output_box.delete(
        "1.0",
        "end"
    )

    reason_type.set("")

    clear_reason_fields()

    update_interface()

    set_message(
        f"Ready — Ticket {ticket_id()}"
    )

    name_entry.focus()


# ============================================================
# INTERFACE / STATUT
# ============================================================

def update_interface():
    status_text.config(
        text=current_status
    )

    # Couleur du statut
    if current_status == "OPEN":
        status_text.config(fg=GREEN)

    elif current_status == "TESTING":
        status_text.config(fg=ORANGE)

    elif current_status == "PERSIST":
        status_text.config(fg=ORANGE)

    elif current_status == "CLOSED":
        status_text.config(fg=RED)

    # Progression
    steps = {
        "OPEN": 1,
        "TESTING": 2,
        "PERSIST": 2,
        "CLOSED": 3
    }

    progress = steps.get(
        current_status,
        0
    )

    for i, label in enumerate(step_labels, start=1):
        if i <= progress:
            label.config(
                fg=BLUE
            )
        else:
            label.config(
                fg=MUTED
            )

    # Boutons
    if current_ticket is None:
        testing_button.config(state="disabled")
        persist_button.config(state="disabled")
        close_button.config(state="disabled")
        reopen_button.config(state="disabled")
    else:
        testing_button.config(
            state="normal"
            if current_status != "CLOSED"
            else "disabled"
        )

        persist_button.config(
            state="normal"
            if current_status in ("TESTING", "OPEN")
            else "disabled"
        )

        close_button.config(
            state="normal"
            if current_status != "CLOSED"
            else "disabled"
        )

        reopen_button.config(
            state="normal"
            if current_status == "CLOSED"
            else "disabled"
        )


# ============================================================
# COMPTEUR
# ============================================================

def update_character_count(event=None):
    text = output_box.get(
        "1.0",
        "end-1c"
    )

    character_count.config(
        text=f"{len(text)} characters"
    )


# ============================================================
# FENÊTRE
# ============================================================

root = tk.Tk()

root.title(
    f"{APP_NAME} {VERSION}"
)

root.geometry(
    "1000x850"
)

root.minsize(
    850,
    700
)

root.configure(
    bg=BG
)


# ============================================================
# STYLE
# ============================================================

style = ttk.Style()

try:
    style.theme_use("clam")
except tk.TclError:
    pass

style.configure(
    "TButton",
    font=("Segoe UI", 10),
    padding=(12, 8)
)

style.configure(
    "TEntry",
    padding=6
)

style.configure(
    "TCombobox",
    padding=6
)


# ============================================================
# HEADER
# ============================================================

header = tk.Frame(
    root,
    bg=BG
)

header.pack(
    fill="x",
    padx=30,
    pady=(22, 10)
)

tk.Label(
    header,
    text="NETWORK TICKET CENTER",
    bg=BG,
    fg=TEXT,
    font=("Segoe UI", 24, "bold")
).pack(
    anchor="w"
)

tk.Label(
    header,
    text="Create  •  Test  •  Persist  •  Close",
    bg=BG,
    fg=MUTED,
    font=("Segoe UI", 10)
).pack(
    anchor="w",
    pady=(3, 0)
)


# ============================================================
# STATUS BAR
# ============================================================

status_bar = tk.Frame(
    root,
    bg=CARD,
    highlightbackground=BORDER,
    highlightthickness=1
)

status_bar.pack(
    fill="x",
    padx=30,
    pady=(0, 15)
)

tk.Label(
    status_bar,
    text="STATUS",
    bg=CARD,
    fg=MUTED,
    font=("Segoe UI", 9, "bold")
).pack(
    side="left",
    padx=(15, 6),
    pady=10
)

status_text = tk.Label(
    status_bar,
    text="OPEN",
    bg=CARD,
    fg=GREEN,
    font=("Segoe UI", 9, "bold")
)

status_text.pack(
    side="left"
)

status_label = tk.Label(
    status_bar,
    text="Ready — Ticket #001",
    bg=CARD,
    fg=MUTED,
    font=("Segoe UI", 9)
)

status_label.pack(
    side="right",
    padx=15
)


# ============================================================
# WORKFLOW
# ============================================================

workflow = tk.Frame(
    root,
    bg=BG
)

workflow.pack(
    fill="x",
    padx=30,
    pady=(0, 15)
)

step_labels = []

for text in (
    "① OPEN",
    "② TESTING",
    "③ CLOSED"
):
    label = tk.Label(
        workflow,
        text=text,
        bg=BG,
        fg=MUTED,
        font=("Segoe UI", 10, "bold")
    )

    label.pack(
        side="left",
        padx=(0, 25)
    )

    step_labels.append(label)

tk.Label(
    workflow,
    text="PERSIST = issue remains after repair",
    bg=BG,
    fg=ORANGE,
    font=("Segoe UI", 9)
).pack(
    side="right"
)


# ============================================================
# CONTENU PRINCIPAL
# ============================================================

content = tk.Frame(
    root,
    bg=BG
)

content.pack(
    fill="both",
    expand=True,
    padx=30
)

content.columnconfigure(
    0,
    weight=1
)

content.columnconfigure(
    1,
    weight=1
)

content.rowconfigure(
    0,
    weight=1
)


# ============================================================
# CARTE GAUCHE
# ============================================================

left_card = tk.Frame(
    content,
    bg=CARD,
    highlightbackground=BORDER,
    highlightthickness=1
)

left_card.grid(
    row=0,
    column=0,
    sticky="nsew",
    padx=(0, 8)
)

left = tk.Frame(
    left_card,
    bg=CARD
)

left.pack(
    fill="both",
    expand=True,
    padx=20,
    pady=20
)

tk.Label(
    left,
    text="TICKET INFORMATION",
    bg=CARD,
    fg=TEXT,
    font=("Segoe UI", 11, "bold")
).pack(
    anchor="w",
    pady=(0, 10)
)


def make_field(label):
    tk.Label(
        left,
        text=label,
        bg=CARD,
        fg=TEXT,
        font=("Segoe UI", 9)
    ).pack(
        anchor="w",
        pady=(6, 2)
    )

    entry = ttk.Entry(left)
    entry.pack(fill="x")

    return entry


name_entry = make_field("Name *")
location_entry = make_field("Location *")
device_entry = make_field("Device")
reason_entry = make_field("Reason *")
ping_entry = make_field("Ping @")


tk.Label(
    left,
    text="Description",
    bg=CARD,
    fg=TEXT,
    font=("Segoe UI", 9)
).pack(
    anchor="w",
    pady=(9, 2)
)

description_box = tk.Text(
    left,
    height=5,
    font=("Segoe UI", 9),
    wrap="word",
    relief="solid",
    borderwidth=1
)

description_box.pack(
    fill="x"
)


# ============================================================
# REASON BUILDER
# ============================================================

tk.Label(
    left,
    text="REASON BUILDER",
    bg=CARD,
    fg=TEXT,
    font=("Segoe UI", 11, "bold")
).pack(
    anchor="w",
    pady=(15, 7)
)

reason_type = tk.StringVar()

reason_menu = ttk.Combobox(
    left,
    textvariable=reason_type,
    state="readonly",
    values=[
        "Not Responding",
        "Performance",
        "Connection Unstable",
        "Packet Loss",
        "High Ping",
        "Wi-Fi Disconnects",
        "DNS Error",
        "No Internet",
        "Custom"
    ]
)

reason_menu.pack(
    fill="x"
)

reason_menu.bind(
    "<<ComboboxSelected>>",
    update_reason_fields
)

reason_fields = tk.Frame(
    left,
    bg=CARD
)

reason_fields.pack(
    fill="x"
)

ttk.Button(
    left,
    text="⚡ Generate Reason",
    command=generate_reason
).pack(
    fill="x",
    pady=(8, 0)
)


# ============================================================
# CARTE DROITE
# ============================================================

right_card = tk.Frame(
    content,
    bg=CARD,
    highlightbackground=BORDER,
    highlightthickness=1
)

right_card.grid(
    row=0,
    column=1,
    sticky="nsew",
    padx=(8, 0)
)

right = tk.Frame(
    right_card,
    bg=CARD
)

right.pack(
    fill="both",
    expand=True,
    padx=20,
    pady=20
)

tk.Label(
    right,
    text="MESSAGE PREVIEW",
    bg=CARD,
    fg=TEXT,
    font=("Segoe UI", 11, "bold")
).pack(
    anchor="w"
)

output_box = tk.Text(
    right,
    font=("Consolas", 10),
    wrap="word",
    relief="solid",
    borderwidth=1,
    padx=12,
    pady=12
)

output_box.pack(
    fill="both",
    expand=True,
    pady=(8, 5)
)

output_box.bind(
    "<KeyRelease>",
    update_character_count
)

character_count = tk.Label(
    right,
    text="0 characters",
    bg=CARD,
    fg=MUTED,
    font=("Segoe UI", 8)
)

character_count.pack(
    anchor="w"
)

ttk.Button(
    right,
    text="📋 COPY MESSAGE",
    command=copy_output
).pack(
    fill="x",
    pady=(10, 0)
)


# ============================================================
# ACTIONS
# ============================================================

actions = tk.Frame(
    root,
    bg=BG
)

actions.pack(
    fill="x",
    padx=30,
    pady=18
)

ttk.Button(
    actions,
    text="⚡ CREATE TICKET",
    command=create_ticket
).pack(
    side="left"
)

testing_button = ttk.Button(
    actions,
    text="🧪 PASS TO TESTING",
    command=pass_to_testing
)

testing_button.pack(
    side="left",
    padx=7
)

persist_button = ttk.Button(
    actions,
    text="⚠ PERSIST",
    command=persist_ticket
)

persist_button.pack(
    side="left"
)

close_button = ttk.Button(
    actions,
    text="✓ CLOSE",
    command=close_ticket
)

close_button.pack(
    side="left",
    padx=7
)

reopen_button = ttk.Button(
    actions,
    text="↻ REOPEN",
    command=reopen_ticket
)

reopen_button.pack(
    side="left"
)

ttk.Button(
    actions,
    text="＋ NEW TICKET",
    command=new_ticket
).pack(
    side="right"
)


# ============================================================
# RACCOURCIS
# ============================================================

root.bind(
    "<Control-Return>",
    lambda event: create_ticket()
)

root.bind(
    "<Control-s>",
    lambda event: copy_output()
)

root.bind(
    "<Escape>",
    lambda event: root.focus()
)


# ============================================================
# DÉMARRAGE
# ============================================================

name_entry.focus()

update_interface()

root.mainloop()