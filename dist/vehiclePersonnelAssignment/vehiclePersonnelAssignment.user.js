// ==UserScript==
// @name            Fahrzeugzuweisung Wachenweise
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.7.3.261120
// @description     Prüft und korrigiert Zuweisungen einer Wache, setzt FMS 2/6.
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://*.leitstellenspiel.de/buildings/*
// @exclude-match   https://forum.leitstellenspiel.de
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261112
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261112
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// @ai              assisted
// ==/UserScript==

'use strict'

const defaults = {
    53: {
        caption: "Dekon-P",
        staff: {
            min: 6,
            training: {
                Feuerwehr: {
                    "dekon_p": { min: 6 },
                },
            },
        },
    },
    63: {
        caption: "GW-Wasserrettung",
        staff: {
            min: 4,
            training: {
                Feuerwehr: {
                    gw_wasserrettung: { all: true },
                },
            },
        },
    },
    65: {
        caption: "LKW 7 Lkr 19 tm",
        staff: {
            training: {
                THW: {
                    gw_wasserrettung: { min: 2 },
                },
            },
        },
    },
    93: {
        caption: "MTW-O",
        staff: {
            training: {
                thw_rescue_dogs: { min: 4 },
            },
        },
    },
    122: {
        caption: "LKW 7 Lbw (FGr E)",
        staff: {
            training: {
                THW: {
                    thw_energy_supply: { min: 1 },
                },
            },
        },
    },
    123: {
        caption: "LKW Lbw (FGr WP)",
        staff: {
            training: {
                THW: {
                    water_damage_pump: { min: 1 },
                },
            },
        },
    },
    135: {
        caption: "Pferdetransporter groß",
        staff: {
            min: 2,
            training: {
                Polizei: {
                    police_horse: { min: 2 },
                },
            },
        },
    },
    137: {
        caption: "Zugfahrzeug Pferdetransport",
        staff: {
            min: 2,
            training: {
                Polizei: {
                    police_horse: { min: 2 },
                },
            },
        },
    },
};

////////////////////////////////////////////////////////////////////////////////

async function main(progress) {
    const overwrites = await readKey('settings-personalassign', 'main', configDB) ?? defaults;

    const vehicleTypes = await getVehicleTypes(I18n.locale);
    await progress(0, 1, 'Load vehicles types');
    const location = window.location.pathname;
    const bID = Number(location.match(/^\/buildings\/(\d+)/)?.[1]);

    let vehicles = await getVehicles(false, 'building', bID);
    await progress(0, 1, 'Load vehicles');
    for (const row of document
        .querySelectorAll(`#vehicle_table > tbody > tr`)) {
        const vehicleLink = row.querySelector(`a[href^='/vehicles/']`);
        const vID = Number(
            vehicleLink?.pathname?.match(/^\/vehicles\/(\d+)(?:\/|$)/)?.[1]
        );
        /*
        const vTypeID = Number(row.cells[0]
            .firstElementChild
            .getAttribute('vehicle_type_id')
        );
        */
        const fmsElement = row.querySelector('.building_list_fms');
        const fmsClass = [...(fmsElement?.classList ?? [])]
            .find(className => /^building_list_fms_\d+$/.test(className));
        const fms = Number(
            fmsClass?.match(/^building_list_fms_(\d+)$/)?.[1]
        );

        let vehicle = vehicles.find(v => v.id === vID);
        if (!vehicle) {
            vehicles = await getVehicles(true, 'building', bID);
            vehicle = vehicles.find(v => v.id === vID);
        }
        vehicle.fms_real = fms;
        vehicle.fms_show = fms;
    };

    await progress(0, 1, 'hole Mitarbeiter Daten ');
    const doc = await fetch(`/vehicles/${vehicles[0].id}/zuweisung`)
        .then(response => {
            if (!response.ok) throw new Error(`fetch fail ${response.status}`);
            return response.text();
        })
        .then(async text => {
            return new DOMParser().parseFromString(text, 'text/html');
        })
        .catch(error => {
            console.error(error);
            throw new Error('abort fetch faild');
        });

    const personals = [];
    const rows = doc.querySelectorAll('#personal_table > tbody > tr');
    const personalTotal = rows.length;
    let done = 0;
    for (const row of rows) {
        done++;
        await progress(done, personalTotal, "verarbeite Mitarbeiter infos ");

        const id = Number(row.getAttribute('id')
            .replace('personal_', '')
        );
        const name = row.cells[0].textContent;
        const assignmentID = Number(row.cells[3].innerHTML
            .match(/href="\/vehicles\/(\d+)"/)?.[1]
        );
        const trainings = await JSON.parse(row.dataset.filterableBy);
        personals.push({ id, name, assignmentID, trainings });
    }
    if (overwrites['reverse'] === true) {
        progress(0, 1, "sortiere Mitarbeiter");
        personals.reverse();
    }
    console.log(personals)

    await progress(0, 1, "ermittle Fahrzeug anforderungen");
    const vehicleRequirements = [];
    vehicles.forEach(v => {
        const vTypeID = v.vehicle_type;
        const vType = vehicleTypes[vTypeID];
        const vTypeOverwirte = overwrites[vTypeID];
        const staffMax = vTypeOverwirte?.staff?.max ?? vType.staff?.max ?? 0;
        const staffMin = vTypeOverwirte?.staff?.min ?? vType.staff?.min ?? 0;
        const t = vTypeOverwirte?.staff?.training ?? vType.staff?.training;
        let training = [];
        if (t) {
            const flat = Object.values(t)[0];
            Object.entries(flat).forEach(([key, object]) => {
                const min = object?.min ?? staffMin;
                const max = object?.max ?? staffMax;
                const all = object?.all ?? false;
                training.push({
                    key, min, max, all
                });
            });
        }
        vehicleRequirements.push({
            id: v.id,
            caption: v.caption,
            type: vTypeID,
            min: staffMin,
            max: staffMax,
            training,
            fms: false
        });
    });
    vehicleRequirements.sort((a, b) => b.training.length - a.training.length);
    console.log(vehicleRequirements.join());

    function assign(vID, person) {
        assignmetns.get(vID).push(person);
        const index = personals.findIndex(p => p.id === person.id);
        personals.splice(index, 1);
    }

    function selectPerson(vehicle) {
        if (vehicle.training.length === 0) {
            return personals.find(p => p.trainings.length === 0);
        }

        const person = personals.find(p =>
            vehicle.training.every(t => p.trainings.includes(t.key))
        );

        if (person) return person;

        const needAll = vehicle.training.filter(t => t.all === true);
        const candidates = personals.filter(p =>
            needAll.every(t => p.trainings.includes(t.key)) &&
            vehicle.training.some(t => p.trainings.includes(t.key))
        );

        function countMatches(person) {
            return vehicle.training.filter(t =>
                person.trainings.includes(t.key)
            ).length;
        }

        candidates.sort((a, b) => countMatches(b) - countMatches(a));

        return candidates[0];
    }

    await progress(0, 1, "suche Ausgebildete Mitarbeiter für jedes Fahrzeug");
    const assignmetns = new Map;
    // fill to min with training
    vehicleRequirements.forEach(vehicle => {
        const vID = vehicle.id;
        assignmetns.set(vID, []);
        for (let seat = 1; seat <= vehicle.min; seat++) {
            const person = selectPerson(vehicle);
            if (person) {
                assign(vID, person);
            }
        }
    });

    // fill to max with training
    vehicleRequirements.forEach(vehicle => {
        const vID = vehicle.id;
        for (let seat = assignmetns.get(vID).length + 1; seat <= vehicle.max; seat++) {
            const person = selectPerson(vehicle);
            if (person) {
                assign(vID, person);
            }
        }
    });


    await progress(0, 1, "fülle Fahrzeuge auf");
    // vehicle have no assigned jet
    vehicleRequirements.forEach(vehicle => {
        const vID = vehicle.id;

        if (assignmetns.get(vID).length < vehicle.min && vehicle.training.length === 0) {
            for (let seat = assignmetns.get(vID).length + 1; seat <= vehicle.min; seat++) {
                const person = personals[0];
                if (person) {
                    assign(vID, person);
                }
            }
        }
    });

    // fill to max
    vehicleRequirements.forEach(vehicle => {
        const vID = vehicle.id;
        const vCaption = vehicle.caption;
        if (assignmetns.get(vID).length < vehicle.max && vehicle.training.length === 0) {
            for (let seat = assignmetns.get(vID).length + 1; seat <= vehicle.max; seat++) {
                const person = personals[0];
                if (person) {
                    assign(vID, person);
                }
            }
        }
        console.log(`assigment ${vCaption}:`, assignmetns.get(vID))
    });

    async function setAssign(vID, vCaption, person) {
        await delay(250);
        try {
            const response = await fetch(
                `/vehicles/${vID}/zuweisungDo/${person.id}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
                    },
                }
            );
            if (!response.ok) throw new Error(`Set assignment ${person.name} for ${vCaption} failed`);
        } catch (error) { console.error(error); }
    }

    // assign to vehicle
    done = 0;
    await progress(0, 1, "Zuweisungen der Mitarbeiter");
    for (const [vID, assigned] of assignmetns) {
        done++;
        await progress(done, personalTotal, "Zuweisung der Mitarbeiter");

        const vCaption = vehicles.find(v => v.id === vID).caption;
        for (const person of assigned) {
            if (vID !== person.assignmentID) {
                console.log(`assign ${person.name} ${person.trainings.join(', ')} to ${vCaption}`);
                await setAssign(vID, vCaption, person)
            }
        }
    }

    // no assign
    console.log(personals)
    for (const person of personals) {
        done++;
        await progress(done, personalTotal, "Mitarbeiter ohne Fahrzeug");
        if (person.assignmentID) {
            const vID = person.assignmentID;
            const vCaption = vehicleRequirements.find(v => v.id === vID).caption;
            console.log(`set ${person.name} to free`);
            await setAssign(vID, vCaption, person)
        }
    }

    async function setFMS(fms, vehicle) {
        const vID = vehicle.id;
        await delay(250);
        try {
            console.log(`/vehicles/${vID}/set_fms/${fms}`);
            const response = await fetch(`/vehicles/${vID}/set_fms/${fms}`);
            if (!response.ok) throw new Error(`set FMS for ${vehicle.caption} failed`)
        } catch (error) { console.error(error) }
    }

    // set fms
    done = 0;
    const vehiclesTotal = vehicles.length;
    await progress(0, 1, "Setze FMS status");
    for (const vehicle of vehicleRequirements) {
        done++;
        const vID = vehicle.id;
        const vTypeID = vehicle.type
        let assigned = assignmetns.get(vID);
        const assignCount = assigned.length;
        const realVehicle = vehicles.find(v => v.id === vID);

        const fms_real = realVehicle.fms_real;
        const fms_show = realVehicle.fms_show;
        const assigned_personnel_count = realVehicle.assigned_personnel_count;
        if (assigned_personnel_count !== assignCount) realVehicle.assigned_personnel_count = assignCount;
        let tractive;
        let min = vehicle.min;
        if (vehicleTypes[vTypeID].isTrailer) {
            const trailer = vehicles.find(v => v.id === vID);
            tractive = vehicleRequirements.find(v => v.id === trailer.tractive_vehicle_id);
            if (tractive) {
                assigned = assignmetns.get(tractive.id);
                min = tractive.min
            }
        }

        if (assigned.length >= min) {
            if (fms_real === 6) {
                await progress(done, vehiclesTotal, "FMS 2");
                console.log(`set ${vehicle.caption} to FMS 2`);
                await setFMS(2, vehicle);
                realVehicle.fms_real = 2;
                realVehicle.fms_show = 2;
            }
        } else if (fms_real === 2) {
            await progress(done, vehiclesTotal, "FMS 6");
            console.log(`set ${vehicle.caption} to FMS 6`);
            await setFMS(6, vehicle);
            realVehicle.fms_real = 6;
            realVehicle.fms_show = 6;
        }
    };
    await saveAll(vehicles, 'vehicles', configDB);
};

async function updateProgress(done, total, message) {
    const percent = total > 0
        ? Math.round(done / total * 100)
        : 0;

    progressBar.hidden = false;
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', String(percent));
    progressBar.textContent = message ?? `${percent}%`;
    await delay(150);

}

let progressBar;
if (!document.querySelector('.vehicleAssign')) {
    const dl = document.querySelector(`.dl-horizontal`);
    const personal = document.querySelector(
        '.dl-horizontal > dd a[href$="/personals"]'
    );
    if (!personal) return;
    const div = document.createElement('div');
    const worker = document.createElement('button');
    worker.className = 'btn btn-default btn-xs vehicleAssign';
    worker.textContent = "Personal auf Fahrzeuge zuweisen";

    const progress = document.createElement('div');
    progress.className = 'progress';
    progress.hidden = true;
    progress.style.marginTop = '5px';

    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');

    const settings = document.createElement('button');
    settings.className = 'btn btn-default btn-xs glyphicon glyphicon-cog vehicleAssignSetting';
    settings.addEventListener('click', async event => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'json,application/json';
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            const rawText = await file.text();
            const cleanText = rawText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
            const settings = await JSON.parse(cleanText);
            await saveKey(settings, 'main', configDB, 'settings-personalassign');
        });
        input.click();
    });

    worker.addEventListener('click', async event => {
        event.preventDefault();
        worker.classList.add('hidden');
        settings.classList.add('hidden')
        progress.hidden = false;
        progressBar.className = 'progress-bar';
        updateProgress(0, 1, "Daten werden geladen");
        try {
            await main(updateProgress);
            updateProgress(1, 1, 'Abgeschlossen');
            progressBar.classList.add('progress-bar-success');
        } catch (error) {
            progressBar.classList.add('progress-bar-danger');
            progressBar.textContent = 'Fehler bei der Verarbeitung';
            console.error(error);
        } finally {
            worker.classList.remove('hidden');
            settings.classList.remove('hidden')
            progressBar.hidden = true;
            progress.hidden = true;
        }
    });

    progress.append(progressBar);
    div.append(worker, settings, progress);
    dl.after(div);
}