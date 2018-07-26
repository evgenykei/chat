var currentFilter = "",
    pageSize = 15;

const jsonURL = window.location.href + 'trainingData';

const metadata = [
	{ name: 'class', label: 'Class', datatype: 'string', editable: true },
	{ name: 'text', label: 'Text', datatype: 'string', editable: true },
	{ name: 'checked', label: 'Checked', datatype: 'boolean', editable: true },
];

//helper function to get path of a demo image
function image(relativePath) {
	return "images/" + relativePath;
}

function sendJson() {
	//prepare data
	let columns = metadata.map((data) => data.name);
	let json = editableGrid.data.map((element) => {
		let obj = {};
		columns.forEach((column, index) => obj[column] = element.columns[index]);
		return obj;
	});
	
	$.ajax({
		url: jsonURL, 
		type: 'POST', 
		contentType: 'application/json', 
		data: JSON.stringify(json),
		success: () => {
			$("#saveMessage").text("Data saved");
			setTimeout(() => $("#saveMessage").text(""), 2000);
		}
	});
}

//function to render the paginator control
EditableGrid.prototype.updatePaginator = function() {
	var paginator = $("#paginator").empty();
	var nbPages = this.getPageCount();

	// get interval
	var interval = this.getSlidingPageInterval(20);
	if (interval == null) return;

	// get pages in interval (with links except for the current page)
	var pages = this.getPagesInInterval(interval, function(pageIndex, isCurrent) {
		if (isCurrent) return "" + (pageIndex + 1);
		return $("<a>").css("cursor", "pointer").html(pageIndex + 1).click(function(event) { editableGrid.setPageIndex(parseInt($(this).html()) - 1); });
	});

	// "first" link
	var link = $("<a>").html("<img src='" + image("gofirst.png") + "'/>&nbsp;");
	if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { editableGrid.firstPage(); });
	paginator.append(link);

	// "prev" link
	link = $("<a>").html("<img src='" + image("prev.png") + "'/>&nbsp;");
	if (!this.canGoBack()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { editableGrid.prevPage(); });
	paginator.append(link);

	// pages
	for (p = 0; p < pages.length; p++) paginator.append(pages[p]).append(" | ");

	// "next" link
	link = $("<a>").html("<img src='" + image("next.png") + "'/>&nbsp;");
	if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { editableGrid.nextPage(); });
	paginator.append(link);

	// "last" link
	link = $("<a>").html("<img src='" + image("golast.png") + "'/>&nbsp;");
	if (!this.canGoForward()) link.css({ opacity : 0.4, filter: "alpha(opacity=40)" });
	else link.css("cursor", "pointer").click(function(event) { editableGrid.lastPage(); });
	paginator.append(link);
};

//Loading function
window.onload = function() {
	editableGrid = new EditableGrid('Classification training data', {
        pageSize: pageSize
    });
	editableGrid.tableRendered = function() { this.updatePaginator(); };
	editableGrid.tableLoaded = function() { this.renderGrid('tablecontent', 'grid'); editableGrid.firstPage(); };
	editableGrid.loadJSON(jsonURL, function(rawJson) {
		if (!rawJson) return console.log('cannot get json data');
		let json = {};

		//set metadata
		json.metadata = metadata;

		//parse data
		json.data = [];
		JSON.parse(rawJson).forEach((item, index) => json.data.push({ id: index, values: item }));

		return JSON.stringify(json);
    });

    // set active (stored) filter if any
	_$('filter').value = currentFilter ? currentFilter : '';

	// filter when something is typed into filter
	_$('filter').onkeyup = function() { editableGrid.filter(_$('filter').value); };

    // bind page size selector
	$("#pagesize").val(pageSize).change(function() { editableGrid.setPageSize($("#pagesize").val()); });
} 