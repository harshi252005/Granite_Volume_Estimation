import sqlite3

def update_undressed_blocks():
    conn = sqlite3.connect('backend/smart_granite.db')
    c = conn.cursor()

    updates = [
        {
            'parent_id': 'BLK-20260930073203',
            'ud_code': 'UD-20260930073203',
            'l': 265.0, 'b': 150.0, 'h': 155.0, 'v': 6.161,
            'children': ['BLK-562734']
        },
        {
            'parent_id': 'BLK-20260930050218',
            'ud_code': 'UD-20260930050218',
            'l': 225.0, 'b': 140.0, 'h': 125.0, 'v': 3.938,
            'children': ['BLK-618398']
        },
        {
            'parent_id': 'BLK-20260929092633',
            'ud_code': 'UD-20260929092633',
            'l': 245.0, 'b': 170.0, 'h': 125.0, 'v': 5.206,
            'children': ['BLK-066195']
        },
        {
            'parent_id': 'BLK-20260918112752',
            'ud_code': 'UD-20260918112752',
            'l': 285.0, 'b': 165.0, 'h': 145.0, 'v': 6.819,
            'children': ['BLK-121269']
        },
        {
            'parent_id': 'BLK-20260916062542',
            'ud_code': 'UD-20260916062542',
            'l': 300.0, 'b': 165.0, 'h': 150.0, 'v': 7.425,
            'children': ['BLK-105490']
        },
        {
            'parent_id': 'BLK-20260912083118',
            'ud_code': 'UD-20260912083118',
            'l': 420.0, 'b': 240.0, 'h': 220.0, 'v': 22.176,
            'children': ['BLK-154365', 'BLK-413478']
        },
        {
            'parent_id': 'BLK-20260912071249',
            'ud_code': 'UD-20260912071249',
            'l': 310.0, 'b': 185.0, 'h': 175.0, 'v': 10.036,
            'children': ['BLK-300219']
        }
    ]

    for u in updates:
        # Update parent record
        c.execute('''
            UPDATE granite_blocks
            SET undressed_length = ?, undressed_breadth = ?, undressed_height = ?, undressed_volume = ?
            WHERE id = ? OR (block_type = 'undressed' AND undressed_id = ?)
        ''', (u['l'], u['b'], u['h'], u['v'], u['parent_id'], u['ud_code']))
        
        # Update children records
        for kid in u['children']:
            c.execute('''
                UPDATE granite_blocks
                SET undressed_length = ?, undressed_breadth = ?, undressed_height = ?, undressed_volume = ?
                WHERE id = ?
            ''', (u['l'], u['b'], u['h'], u['v'], kid))
            
        print(f"Updated {u['parent_id']} ({u['ud_code']}) -> {u['l']}x{u['b']}x{u['h']} cm, {u['v']} m3")

    conn.commit()

    # Verify all undressed parent blocks and their children
    print("\n=== POST-UPDATE VERIFICATION ===")
    c.execute('''
        SELECT b.id, b.undressed_id, b.undressed_length, b.undressed_breadth, b.undressed_height, b.undressed_volume
        FROM granite_blocks b
        WHERE b.block_type = 'undressed'
    ''')
    parents = c.fetchall()

    all_ok = True
    for p in parents:
        pid, ucode, pl, pb, ph, pv = p
        c.execute('''
            SELECT b.id, m.length, m.breadth, m.height, m.volume
            FROM granite_blocks b
            LEFT JOIN measurements m ON b.id = m.block_id
            WHERE (b.undressed_id = ? OR b.undressed_id = ?) AND b.id != ?
        ''', (pid, ucode, pid))
        kids = c.fetchall()
        print(f"Parent {pid} ({ucode}): {pl}x{pb}x{ph} cm, vol={pv} m3")
        for k in kids:
            kid_id, kl, kb, kh, kv = k
            if kl is not None and kv is not None:
                if pv <= kv or pl < kl or pb < kb or ph < kh:
                    print(f"   [FAIL] Child {kid_id}: {kl}x{kb}x{kh} cm, vol={kv} m3 (pv={pv})")
                    all_ok = False
                else:
                    recovery = round(kv / pv * 100, 1)
                    waste = round(100 - recovery, 1)
                    print(f"   [PASS] Child {kid_id}: {kl}x{kb}x{kh} cm, vol={kv} m3 (Yield: {recovery}%, Waste: {waste}%)")

    conn.close()
    if all_ok:
        print("\nALL PARENT AND CHILD BLOCKS ARE FULLY VERIFIED: Volume_raw > Volume_dressed!")
    else:
        print("\nSOME INVERSIONS REMAIN!")

if __name__ == '__main__':
    update_undressed_blocks()
