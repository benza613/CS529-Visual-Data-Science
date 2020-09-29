var width = parseInt(d3.select('.viz').style('width'))
    , mapRatio = 0.5
    , height = width * mapRatio
    , active = d3.select(null);

let cityCountsData = null;
let stateCountsData = null;
let victimsData = null;


let DTABLE = null;

var color = d3.scaleSqrt()
    .domain([2, 20])
    .range(d3.schemeBlues[9]);

function getColor(scheme) {
    return d3.scaleLinear()
        .domain([0, 3])
        .range(scheme)
}

const svg = d3.select('.viz').append('svg')
    .attr('class', 'center-container')
    .attr('height', height)
    .attr('width', width)


Promise.all([
    d3.json('json/us-states.topojson'),
    d3.json('json/states_freq2.json'),
    d3.json('json/city_freq2.json'),
    d3.json('json/victim_Details.json')
])
    .then(([data, stateCounts, cityCounts, victimsDetails]) => {
        loadMap(data, stateCounts, cityCounts, victimsDetails)
    });

const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(width);

const path = d3.geoPath()
    .projection(projection);

const g = svg.append("g")
    .attr('class', 'center-container center-items us-state-g')
    .attr('width', width)
    .attr('height', height);




function loadMap(data, stateCounts, cityCounts, victimsDetails) {
    stateCountsData = stateCounts;
    victimsData = victimsDetails;

    let usStates = topojson.feature(data, data.objects.collection).features;

    // LOAD the map
    g.selectAll('.us-state')
        .data(usStates)
        .enter().append('path')
        .attr('class', 'us-state')
        .attr('d', path)
        .attr("fill", function (d) {
            let name = d.properties.NAME;
            if (name in stateCounts)
                return color(d.rate = stateCounts[d.properties.NAME]['freq']);
            else
                return color(d.rate = 0)
        })
        .on("mousemove", function (d) {
            if (active.node() === this) return;

            var html = "";

            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d.properties.NAME;
            html += "</span><br/>";
            html += "<span class=\"tooltip_value\">Victims: ";
            html += stateCounts[d.properties.NAME].freq + "<br/>";
            html += "M: " + stateCounts[d.properties.NAME].genderM + " | F: " + stateCounts[d.properties.NAME].genderF;
            if (stateCounts[d.properties.NAME].genderNan > 0)
                html += " | Unknown: " + stateCounts[d.properties.NAME].genderNan;
            html += "</span>";
            html += "</div>";

            $("#tooltip-container").html(html);
            $(this).attr("fill-opacity", "0.2");
            $("#tooltip-container").show();

            var map_width = $('.us-state-g')[0].getBoundingClientRect().width;

            if (d3.event.layerX < map_width / 2) {
                d3.select("#tooltip-container")
                    .style("top", (d3.event.layerY + 15) + "px")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                var tooltip_width = $("#tooltip-container").width();
                d3.select("#tooltip-container")
                    .style("top", (d3.event.layerY + 15) + "px")
                    .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
            }
        })
        .on('mouseout', function () {
            $('#tooltip-container').hide();
        })
        .on('click', loadStateData);

    arrStatesData = []
    // LOAD THE STATE TABLE
    for (const state in stateCounts) {
        let tempState = stateCounts[state];
        tempState['full_state_name'] = state

        arrStatesData.push(tempState);
    }
    console.log(arrStatesData)

    cityCountsData = [];
    for (const city in cityCounts) {
        let tempCity = cityCounts[city];
        tempCity['full_city_name'] = city
        cityCountsData.push(tempCity)
    }


    updateBannerTotals(null, null)

    DTABLE = $('#maintable').DataTable({
        data: arrStatesData,
        "destroy": true,
        columns: [
            {
                data: "full_state_name",
                title: "State Name"
            },
            {
                data: "state_code",
                title: "State Code"
            },
            {
                data: "ageGroup1",
                title: "Children"
            },
            {
                data: "ageGroup2",
                title: "Teens"
            },
            {
                data: "ageGroup3",
                title: "Adults"
            },
            {
                data: "ageGroupNan",
                title: "Unknown"
            }
        ]
    });

}


function loadStateData(d) {


    let code = stateCountsData[d.properties.NAME].state_code;

    DTABLE.destroy()
    $('#maintable').empty();

    let filtered_citydata = cityCountsData.filter(x => x.state_code == code);
    let arr_fAges = [];
    for (let i = 0; i < filtered_citydata.length; i++) {
        arr_fAges.push(filtered_citydata[i].age == "nan" ? 0 : parseInt(filtered_citydata[i].age))
    }

    console.log(arr_fAges);
    let sorted_cityData = filtered_citydata.sort((a, b) => (a.freq < b.freq) ? 1 : -1);

    DTABLE = $('#maintable').DataTable({
        "destroy": true,
        data: sorted_cityData,
        columns: [
            {
                data: "full_city_name",
                title: "City Name"
            },
            {
                data: "freq",
                title: "Total Deaths",
                hidden: "true"
            },
            {
                data: "ageGroup1",
                title: "Children"
            },
            {
                data: "ageGroup2",
                title: "Teens"
            },
            {
                data: "ageGroup3",
                title: "Adults"
            },
            {
                data: "ageGroupNan",
                title: "Unknown"
            }
        ],
        order: [1, "desc"]
    });

    updateBannerTotals(code, d.properties.NAME);
    updateVictimGrid(code);


}

function updateBannerTotals(stateCode, stateName) {
    let m_a = 0;
    let m_t = 0;
    let m_c = 0;
    let f_a = 0;
    let f_t = 0;
    let f_c = 0;

    let m_TOTAL = 0;
    let f_TOTAL = 0;

    console.log(victimsData);

    if (stateCode == null) {
        for (let i = 0; i < victimsData.victims.length; i++) {
            const victim = victimsData.victims[i];

            if (victim.gender == "M") {
                m_TOTAL += 1;
            } else if (victim.gender == "F") {
                f_TOTAL += 1;
            }

            if (victim.gender == "M" && victim.ageGroup == 3) {
                m_a += 1;
            }
            else if (victim.gender == "M" && victim.ageGroup == 2) {
                m_t += 1;
            }
            else if (victim.gender == "M" && victim.ageGroup == 1) {
                m_c += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 3) {
                f_a += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 2) {
                f_t += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 1) {
                f_c += 1;
            }

        }

        console.log(m_a)
        console.log(m_t)

        // update banner html
        d3.select('#totalMaleDeaths').html(m_TOTAL);
        d3.select('#totalFemaleDeaths').html(f_TOTAL);

        d3.select('#maleChildren').html(m_c);
        d3.select('#maleTeens').html(m_t);
        d3.select('#maleAdults').html(m_a);

        d3.select('#femaleChildren').html(f_c);
        d3.select('#femaleTeens').html(f_t);
        d3.select('#femaleAdults').html(f_a);
    }
    else {

        d3.selectAll('.stateDrillDown').html('in ' + stateName);

        let subVCData = victimsData.victims.filter(x => x.state_code == stateCode);

        for (let i = 0; i < subVCData.length; i++) {
            const victim = subVCData[i];

            if (victim.gender == "M") {
                m_TOTAL += 1;
            } else if (victim.gender == "F") {
                f_TOTAL += 1;
            }

            if (victim.gender == "M" && victim.ageGroup == 3) {
                m_a += 1;
            }
            else if (victim.gender == "M" && victim.ageGroup == 2) {
                m_t += 1;
            }
            else if (victim.gender == "M" && victim.ageGroup == 1) {
                m_c += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 3) {
                f_a += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 2) {
                f_t += 1;
            }
            else if (victim.gender == "F" && victim.ageGroup == 1) {
                f_c += 1;
            }

        }

        console.log(m_a)
        console.log(m_t)

        // update banner html
        d3.select('#totalMaleDeaths').html(m_TOTAL);
        d3.select('#totalFemaleDeaths').html(f_TOTAL);

        d3.select('#maleChildren').html(m_c);
        d3.select('#maleTeens').html(m_t);
        d3.select('#maleAdults').html(m_a);

        d3.select('#femaleChildren').html(f_c);
        d3.select('#femaleTeens').html(f_t);
        d3.select('#femaleAdults').html(f_a);
    }
}


const vic_grid = d3.selectAll('div#grid-ma').append('svg')
    .attr('class', 'center-container center-items grid-g')
    .attr('width', width)
    .attr('transform', 'translate(10,10)');

const vicg_grid = vic_grid.append('g')
    .attr('class', 'center-container center-items grid-g')
    .attr('width', width)
    .attr('transform', 'translate(10,10)');


const gridRadius = 7;
const numPerRow = Math.floor(d3.select('.grid-g').attr('width') / (gridRadius * 2.5));
const sizeOfEncoding = Math.floor(d3.select('.grid-g').attr('width') / (numPerRow));

console.log('numPerRow', numPerRow);
console.log('sizeOfEncoding', sizeOfEncoding);


function updateVictimGrid(stateCode) {
    console.log(stateCode)
    let filtVicts = victimsData.victims
        .filter(x => x.state_code == stateCode);

    let fV_MA = filtVicts.filter(x => x.gender == "M" && x.ageGroup == 3);
    let fV_FA = filtVicts.filter(x => x.gender == "F" && x.ageGroup == 3);

    let fV_MT = filtVicts.filter(x => x.gender == "M" && x.ageGroup == 2);
    let fV_FT = filtVicts.filter(x => x.gender == "F" && x.ageGroup == 2);

    let fV_MC = filtVicts.filter(x => x.gender == "M" && x.ageGroup == 1);
    let fV_FC = filtVicts.filter(x => x.gender == "F" && x.ageGroup == 1);




    const scale = d3.scaleLinear()
        .domain([0, numPerRow - 1])
        .range([0, sizeOfEncoding * numPerRow - 5]);


    d3.selectAll(".gridV").selectAll("a").remove();

    tempGrid1 = d3.selectAll("div#grid-ma").selectAll("svg")
        .data(fV_MA)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            console.log('mousemove');
            console.log(d);
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-male fa-2x')

    tempGrid2 = d3.select("div#grid-fa").selectAll("svg")
        .data(fV_FA)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-female fa-2x')

    tempGrid3 = d3.select("div#grid-mt").selectAll("svg")
        .data(fV_MT)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-male fa-2x')

    tempGrid4 = d3.select("div#grid-ft").selectAll("svg")
        .data(fV_FT)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-female fa-2x')

    tempGrid5 = d3.select("div#grid-mc").selectAll("svg")
        .data(fV_MC)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-male fa-2x')

    tempGrid6 = d3.select("div#grid-fc").selectAll("svg")
        .data(fV_FC)
        .enter()
        .append('a')
        .attr('href', (d) => {
            return d['urls']
        })
        .attr('target', '_blank')

        .append('circle')
        .attr('r', gridRadius)
        .attr('cx', (d, i) => {
            const n = i % numPerRow;
            return scale(n)
        })
        .attr('cy', (d, i) => {
            const n = Math.floor(i / numPerRow);
            return scale(n)
        })
        .on("mousemove", function (d) {
            let html = "";
            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d['name'];
            html += "</span>";
            html += "<span class=\"tooltip_value\">Age: ";
            html += d['age'];
            html += "";
            html += "</span>";
            html += "</div>";
            html += '<div>';
            html += '<span class=\"subtext\">Date: ';
            html += d['date'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Gender: ';
            html += d['gender'];
            html += "</span><br/>";
            html += '<span class=\"subtext\">Location: ';
            html += d['city'] + ', ' + d['state_code'];
            html += "</span>";
            html += "</div>";

            $("#gridtip-container").html(html);
            $("#gridtip-container").show();
            let map_w = $('.grid-g')[0].getBoundingClientRect().width;
            let map_h = $('.grid-g')[0].getBoundingClientRect().height;

            if (d3.event.layerX < map_w / 2) {
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX + 15) + "px");
            } else {
                let tooltip_w = $("#gridtip-container").width();
                d3.select("#gridtip-container")
                    .style("left", (d3.event.layerX - tooltip_w - 30) + "px");
            }

            if (d3.event.layerY < map_h / 2) {
                d3.select('#gridtip-container')
                    .style("top", (d3.event.layerY + 15) + "px")
            } else {
                let tooltip_h = $("#gridtip-container").height();
                d3.select("#gridtip-container")
                    .style("top", (d3.event.layerY - tooltip_h - 30) + "px");
            }
        }).on('mouseout', function () {
            $('#gridtip-container').hide();
        })
        .append('i')
        .attr('class', 'fas fa-female fa-2x')
}

function reset() {

    // TODO redraw datatable here
}
