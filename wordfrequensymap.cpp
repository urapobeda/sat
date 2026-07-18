#include "WordFrequencyMap.h"

using namespace std;

const double WordFrequencyMap::MAX_LOAD_FACTOR = 0.70;

WordFrequencyMap::WordFrequencyMap() {
    allocate_table(DEFAULT_CAPACITY);
}

WordFrequencyMap::WordFrequencyMap(size_t initialCapacity) {
    if (initialCapacity < DEFAULT_CAPACITY) {
        initialCapacity = DEFAULT_CAPACITY;
    }
    allocate_table(initialCapacity);
}

WordFrequencyMap::WordFrequencyMap(const WordFrequencyMap& other) {
    copy_from(other);
}

WordFrequencyMap& WordFrequencyMap::operator=(const WordFrequencyMap& other) {
    if (this != &other) {
        delete[] table;
        copy_from(other);
    }
    return *this;
}

WordFrequencyMap::~WordFrequencyMap() {
    delete[] table;
}

void WordFrequencyMap::allocate_table(size_t capacity) {
    table_capacity = capacity;
    entry_count = 0;
    table = new Entry[table_capacity];
}

void WordFrequencyMap::copy_from(const WordFrequencyMap& other) {
    table_capacity = other.table_capacity;
    entry_count = other.entry_count;
    table = new Entry[table_capacity];

    for (size_t i = 0; i < table_capacity; i++) {
        table[i] = other.table[i];
    }
}

size_t WordFrequencyMap::size() const {
    return entry_count;
}

size_t WordFrequencyMap::capacity() const {
    return table_capacity;
}

bool WordFrequencyMap::empty() const {
    return entry_count == 0;
}

double WordFrequencyMap::load_factor() const {
    if (table_capacity == 0) {
        return 0.0;
    }
    return (double)entry_count / table_capacity;
}

size_t WordFrequencyMap::hash(const string& key) const {
    if (table_capacity == 0) {
        return 0;
    }

    size_t h = 0;
    for (size_t i = 0; i < key.length(); i++) {
        h = (h * 31 + key[i]) % table_capacity;
    }
    return h;
}

void WordFrequencyMap::increment(const string& word) {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            table[cur].value++;
            return;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            break;
        }
    }

    insert_robin_hood(word, 1);
}

void WordFrequencyMap::put(const string& word, int frequency) {
    insert_robin_hood(word, frequency);
}

bool WordFrequencyMap::contains(const string& word) const {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            return true;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            return false;
        }
    }

    return false;
}

int WordFrequencyMap::get(const string& word) const {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            return table[cur].value;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            return 0;
        }
    }

    return 0;
}

bool WordFrequencyMap::remove(const string& word) {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            table[cur].key = "";
            table[cur].value = 0;
            table[cur].occupied = false;
            table[cur].deleted = true;
            table[cur].probe_distance = 0;
            entry_count--;
            return true;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            return false;
        }
    }

    return false;
}

void WordFrequencyMap::clear() {
    delete[] table;
    table = new Entry[table_capacity];
    entry_count = 0;
}

void WordFrequencyMap::resize(size_t newCapacity) {
    if (newCapacity < DEFAULT_CAPACITY) {
        newCapacity = DEFAULT_CAPACITY;
    }

    while (entry_count > 0 && (double)entry_count / newCapacity > MAX_LOAD_FACTOR) {
        newCapacity *= 2;
    }

    Entry* old = table;
    size_t oldCapacity = table_capacity;

    allocate_table(newCapacity);

    for (size_t i = 0; i < oldCapacity; i++) {
        if (old[i].occupied && !old[i].deleted) {
            insert_entry_robin_hood(old[i].key, old[i].value);
        }
    }

    delete[] old;
}

void WordFrequencyMap::print(ostream& out) const {
    bool first = true;

    for (size_t i = 0; i < table_capacity; i++) {
        if (table[i].occupied && !table[i].deleted) {
            if (!first) {
                out << " ";
            }
            out << table[i].key << ":" << table[i].value;
            first = false;
        }
    }
}

void WordFrequencyMap::insert_linear(const string& word, int frequency) {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            table[cur].value = frequency;
            return;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            break;
        }
    }

    if ((double)(entry_count + 1) / table_capacity > MAX_LOAD_FACTOR) {
        resize(table_capacity * 2);
    }

    idx = hash(word);
    size_t firstDeleted = table_capacity;

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (!table[cur].occupied) {
            if (table[cur].deleted) {
                if (firstDeleted == table_capacity) {
                    firstDeleted = cur;
                }
            } else {
                if (firstDeleted != table_capacity) {
                    cur = firstDeleted;
                }
                table[cur].key = word;
                table[cur].value = frequency;
                table[cur].occupied = true;
                table[cur].deleted = false;
                table[cur].probe_distance = (cur + table_capacity - idx) % table_capacity;
                entry_count++;
                return;
            }
        }
    }

    if (firstDeleted != table_capacity) {
        size_t cur = firstDeleted;
        table[cur].key = word;
        table[cur].value = frequency;
        table[cur].occupied = true;
        table[cur].deleted = false;
        table[cur].probe_distance = (cur + table_capacity - idx) % table_capacity;
        entry_count++;
    }
}

void WordFrequencyMap::insert_robin_hood(const string& word, int frequency) {
    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        size_t cur = (idx + i) % table_capacity;

        if (table[cur].occupied && !table[cur].deleted && table[cur].key == word) {
            table[cur].value = frequency;
            return;
        }

        if (!table[cur].occupied && !table[cur].deleted) {
            break;
        }
    }

    if ((double)(entry_count + 1) / table_capacity > MAX_LOAD_FACTOR) {
        resize(table_capacity * 2);
    }

    insert_entry_robin_hood(word, frequency);
}

void WordFrequencyMap::insert_entry_robin_hood(const string& word, int frequency) {
    Entry cur;
    cur.key = word;
    cur.value = frequency;
    cur.occupied = true;
    cur.deleted = false;
    cur.probe_distance = 0;

    size_t idx = hash(word);

    for (size_t i = 0; i < table_capacity; i++) {
        if (!table[idx].occupied || table[idx].deleted) {
            table[idx] = cur;
            table[idx].deleted = false;
            entry_count++;
            return;
        }

        if (table[idx].key == cur.key) {
            table[idx].value = cur.value;
            return;
        }

        if (cur.probe_distance > table[idx].probe_distance) {
            Entry tmp = table[idx];
            table[idx] = cur;
            cur = tmp;
        }

        idx = (idx + 1) % table_capacity;
        cur.probe_distance++;
    }
}

size_t WordFrequencyMap::max_probe_distance() const {
    size_t max = 0;

    for (size_t i = 0; i < table_capacity; i++) {
        if (table[i].occupied && !table[i].deleted && table[i].probe_distance > max) {
            max = table[i].probe_distance;
        }
    }

    return max;
}

double WordFrequencyMap::average_probe_distance() const {
    if (entry_count == 0) {
        return 0.0;
    }

    double sum = 0.0;

    for (size_t i = 0; i < table_capacity; i++) {
        if (table[i].occupied && !table[i].deleted) {
            sum += table[i].probe_distance;
        }
    }

    return sum / entry_count;
}

string WordFrequencyMap::most_frequent() const {
    string best = "";
    int bestValue = 0;
    bool found = false;

    for (size_t i = 0; i < table_capacity; i++) {
        if (table[i].occupied && !table[i].deleted) {
            if (!found || table[i].value > bestValue || (table[i].value == bestValue && table[i].key < best)) {
                best = table[i].key;
                bestValue = table[i].value;
                found = true;
            }
        }
    }

    return best;
}

void WordFrequencyMap::print_statistics(ostream& out) const {
    out << size() << " " << capacity() << " " << load_factor() << " " << max_probe_distance() << " " << average_probe_distance();
}

ostream& operator<<(ostream& out, const WordFrequencyMap& map) {
    map.print(out);
    return out;
}